from datetime import datetime, timedelta
import pandas as pd
import numpy as np

def calculate_metrics(account_info, trades, equity_history, extended_equity_history=None):
    """
    Calculates the required trading metrics.
    """
    # 1. Account Size: Earliest balance or cumulative sum start
    # We'll use the first entry in equity_history if available
    initial_balance = 0.0
    if equity_history:
        initial_balance = equity_history[0][1]
    else:
        initial_balance = account_info.get('balance', 0)

    # 2. Scalp Trades
    scalp_count = 0
    total_trades = len(trades)
    first_scalp_date = None
    
    for t in trades:
        duration = (t['close_time'] - t['open_time']).total_seconds()
        if duration <= 300: # 5 minutes
            scalp_count += 1
            if first_scalp_date is None or t['close_time'] < first_scalp_date:
                first_scalp_date = t['close_time']
    
    scalp_percent = (scalp_count / total_trades * 100) if total_trades > 0 else 0

    # 3. Maximum Drawdown (Equity-Based)
    # 4. Loss from Peak
    # 5. Drawdown Time
    
    max_dd = 0.0
    loss_from_peak = 0.0
    drawdown_time = timedelta(0)
    
    loss_from_peak_currency = 0.0
    
    if equity_history:
        # Sort by time just in case
        equity_history.sort(key=lambda x: x[0])
        
        times = [e[0] for e in equity_history]
        values = [e[1] for e in equity_history]
        
        equity_series = pd.Series(values, index=times)
        running_max = equity_series.cummax()
        
        # Drawdown calculation from closed-deal equity curve
        # dd = (current - max) / max
        drawdowns = (equity_series - running_max) / running_max
        max_dd = abs(drawdowns.min() * 100) if not drawdowns.empty else 0
        
        current_equity = values[-1]
        peak_equity = running_max.iloc[-1]
        loss_from_peak = abs((current_equity - peak_equity) / peak_equity * 100) if peak_equity > 0 else 0
        loss_from_peak_currency = peak_equity - current_equity
        
        # Drawdown Time Calculation
        is_in_drawdown = equity_series < running_max
        longest_dd_duration = timedelta(0)
        start_time = None
        
        for time, in_dd in is_in_drawdown.items():
            if in_dd:
                if start_time is None:
                    start_time = time
            else:
                if start_time is not None:
                    duration = time - start_time
                    if duration > longest_dd_duration:
                        longest_dd_duration = duration
                    start_time = None
        
        if start_time is not None:
            duration = times[-1] - start_time
            if duration > longest_dd_duration:
                longest_dd_duration = duration
        
        drawdown_time = longest_dd_duration

    # --- Per-Trade Intra-Trade Drawdown ---
    # Walk through trades chronologically. For each trade, compute the worst
    # equity dip it caused *during* its lifetime using worst_unrealised_pl
    # (estimated from OHLC bars in mt_bridge.py).
    # The overall max drawdown is the worst of:
    #   1. The equity-curve-based max_dd (from closed deal snapshots)
    #   2. Any per-trade intra-trade drawdown
    
    intra_trade_max_dd = 0.0
    ever_hit_20_pct = False
    breach_date = None
    
    if equity_history:
        breaches = drawdowns[drawdowns <= -0.2]
        if not breaches.empty:
            ever_hit_20_pct = True
            breach_date = breaches.index[0]
            
    if trades and equity_history:
        # Sort trades by open_time
        sorted_trades = sorted(trades, key=lambda t: t['open_time'])
        
        equity_values = [e[1] for e in equity_history]
        equity_times = [e[0] for e in equity_history]
        
        for t in sorted_trades:
            worst_pl = t.get('worst_unrealised_pl', 0.0)
            if worst_pl >= 0:
                continue  # Trade never went negative, skip
            
            # Find the equity level just before/at this trade's open time
            # (the running peak equity at the trade's open)
            trade_open = t['open_time']
            
            # Find the last equity snapshot at or before trade_open
            peak_at_open = equity_values[0] if equity_values else initial_balance
            for i, et in enumerate(equity_times):
                if et <= trade_open:
                    peak_at_open = max(peak_at_open, equity_values[i])
                else:
                    break
            
            if peak_at_open <= 0:
                continue
            
            # The worst equity during this trade = equity_at_open + worst_unrealised_pl
            # But we care about drawdown from peak, so:
            # equity_at_open is the equity when the trade was opened (approximated
            # by the last equity snapshot). The worst dip is equity_at_open + worst_pl.
            # Find the actual equity at trade open (not peak, just current)
            equity_at_open = equity_values[0] if equity_values else initial_balance
            for i, et in enumerate(equity_times):
                if et <= trade_open:
                    equity_at_open = equity_values[i]
                else:
                    break
            
            worst_equity_during_trade = equity_at_open + worst_pl
            trade_dd_from_peak = abs((worst_equity_during_trade - peak_at_open) / peak_at_open * 100) if peak_at_open > 0 else 0
            
            if trade_dd_from_peak > intra_trade_max_dd:
                intra_trade_max_dd = trade_dd_from_peak
            
            if trade_dd_from_peak >= 20.0:
                ever_hit_20_pct = True
                if breach_date is None or t['open_time'] < breach_date:
                    breach_date = t['open_time']

    # Overall max DD = worst of equity-curve DD and intra-trade DD
    max_dd = max(max_dd, intra_trade_max_dd)

    # Evaluation
    # PASS if:
    # - Maximum DD <= 20% AND no trade ever hit 20% intra-trade drawdown
    # - Loss from Peak <= 5%
    # - No Scalp Trades allowed (duration > 5 mins)
    
    is_pass = (not ever_hit_20_pct and 
               max_dd <= 20.0 and
               loss_from_peak <= 5.0 and 
               scalp_count == 0)
    
    result = "PASS" if is_pass else "FAIL"

    current_balance = account_info.get('balance', 0)

    # --- 1. Live Metrics ---
    equity = account_info.get('equity', 0.0)
    margin_free = account_info.get('margin_free', 0.0)
    margin_level = account_info.get('margin_level', 0.0)
    leverage = account_info.get('leverage', 0)
    currency = account_info.get('currency', 'USD')
    floating_pl = account_info.get('profit', 0.0)

    # --- 2. Performance & Strategy Analytics ---
    win_count = sum(1 for t in trades if t['profit'] > 0)
    win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
    total_pl = sum(t['profit'] for t in trades)
    
    gross_profit = sum(t['profit'] for t in trades if t['profit'] > 0)
    gross_loss = abs(sum(t['profit'] for t in trades if t['profit'] < 0))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (0.0 if gross_profit == 0 else float('inf'))
    
    durations = [(t['close_time'] - t['open_time']).total_seconds() for t in trades]
    avg_duration_sec = sum(durations) / total_trades if total_trades > 0 else 0
    avg_duration_td = timedelta(seconds=avg_duration_sec)
    
    profits = [t['profit'] for t in trades]
    best_trade = max(profits) if profits else 0.0
    worst_trade = min(profits) if profits else 0.0
    
    # Trade Frequency (Trades per day)
    trade_freq = 0.0
    if trades:
        start_date = min(t['open_time'] for t in trades)
        end_date = max(t['close_time'] for t in trades)
        days_active = (end_date - start_date).days + 1
        trade_freq = total_trades / days_active if days_active > 0 else total_trades
    
    # --- 3. Risk Management ---
    expectancy = total_pl / total_trades if total_trades > 0 else 0.0
    
    # Risk per Trade (Average loss / Account Size)
    losses = [abs(t['profit']) for t in trades if t['profit'] < 0]
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    risk_per_trade = (avg_loss / initial_balance * 100) if initial_balance > 0 else 0.0

    # Evaluation (final — includes intra-trade drawdown)
    is_pass = (not ever_hit_20_pct and
               max_dd <= 20.0 and 
               loss_from_peak <= 5.0 and 
               scalp_count == 0)
    
    result = "PASS" if is_pass else "FAIL"

    # Currency Symbol Mapping
    currency_symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "JPY": "¥",
        "AUD": "A$",
        "CAD": "C$",
        "CHF": "Fr",
        "NGN": "₦",
        "ZAR": "R"
    }
    sym = currency_symbols.get(currency, currency + " ")

    return {
        "Account": str(account_info.get('login', '')),
        "Checked Time": datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
        "Account Size": f"{sym}{initial_balance:,.2f}",
        "Balance": f"{sym}{current_balance:,.2f}",
        "Equity": f"{sym}{equity:,.2f}",
        "Margin Free": f"{sym}{margin_free:,.2f}",
        "Margin Level": f"{margin_level:.2f}%",
        "Leverage": f"1:{leverage}",
        "Currency": currency,
        "Win Rate": f"{win_rate:.1f}%",
        "Total P/L": f"{sym}{total_pl:,.2f}",
        "Profit Factor": f"{profit_factor:.2f}" if profit_factor != float('inf') else "MAX",
        "Avg Duration": str_drawdown_time(avg_duration_td),
        "Best Trade": f"{sym}{best_trade:,.2f}",
        "Worst Trade": f"{sym}{worst_trade:,.2f}",
        "Avg Loss": f"{sym}{avg_loss:,.2f}",
        "Trade Frequency": f"{trade_freq:.1f} trades/day",
        "Floating P/L": f"{sym}{floating_pl:,.2f}",
        "Risk Per Trade": f"{risk_per_trade:.2f}%",
        "Expectancy": f"{sym}{expectancy:,.2f}",
        "Scalp Trades": scalp_count,
        "Maximum DD": f"{max_dd:.2f}%",
        "Loss from Peak": f"{sym}{loss_from_peak_currency:,.2f}",
        "Drawdown Time": str_drawdown_time(drawdown_time),
        "Drawdown Alert": ever_hit_20_pct,
        "Breach Date": breach_date.strftime("%Y-%m-%d %H:%M") if breach_date else None,
        "Scalping Breach Date": first_scalp_date.strftime("%Y-%m-%d %H:%M") if first_scalp_date else None,
        "Result": result,
        "Request(s)": "Success",
        "History": [
            {
                "ticket": t['ticket'],
                "open_time": t['open_time'],
                "type": t['type'],
                "volume": t['volume'],
                "symbol": t['symbol'],
                "open_price": t['open_price'],
                "close_time": t['close_time'],
                "close_price": t['close_price'],
                "profit": t['profit']
            } for t in trades
        ],
        "Equity History": [
            {"time": e[0], "equity": e[1]} for e in equity_history
        ],
        "Extended Equity History": [
            {"time": e[0], "equity": e[1]} for e in (extended_equity_history or equity_history)
        ]
    }

def str_drawdown_time(td):
    days = td.days
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    
    if not parts:
        return "0 minutes"
    return " ".join(parts)
