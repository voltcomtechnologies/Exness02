import MetaTrader5 as mt5
from datetime import datetime, timedelta
import time

def _compute_worst_unrealised_pl(trade, mt5_module=mt5):
    """
    For a closed trade, fetch OHLC bars during the trade's lifetime
    and compute the worst unrealised P/L the trade experienced.
    Returns the worst unrealised P/L as a negative number (or 0 if never negative).
    """
    symbol = trade['symbol']
    open_time = trade['open_time']
    close_time = trade['close_time']
    open_price = trade['open_price']
    volume = trade['volume']
    trade_type = trade['type']  # 'buy' or 'sell'

    # Fetch M1 bars for the trade's symbol during the trade window
    # M1 gives the finest granularity for worst-case drawdown estimation
    bars = mt5_module.copy_rates_range(symbol, mt5_module.TIMEFRAME_M1, open_time, close_time)
    
    if bars is None or len(bars) == 0:
        # Fallback: try M5 if M1 is not available
        bars = mt5_module.copy_rates_range(symbol, mt5_module.TIMEFRAME_M5, open_time, close_time)
    
    if bars is None or len(bars) == 0:
        # No bar data available — fall back to using the closed profit
        return min(trade['profit'], 0.0)
    
    # Get symbol info for point value / contract size
    symbol_info = mt5_module.symbol_info(symbol)
    if symbol_info is None:
        return min(trade['profit'], 0.0)
    
    tick_value = symbol_info.trade_tick_value
    tick_size = symbol_info.trade_tick_size
    
    if tick_size == 0:
        return min(trade['profit'], 0.0)
    
    worst_pl = 0.0
    
    for bar in bars:
        if trade_type == 'buy':
            # For a buy, the worst price is the lowest low
            worst_price = bar['low']
            price_diff = worst_price - open_price
        else:
            # For a sell, the worst price is the highest high
            worst_price = bar['high']
            price_diff = open_price - worst_price
        
        # Convert price difference to monetary P/L
        unrealised_pl = (price_diff / tick_size) * tick_value * volume
        
        if unrealised_pl < worst_pl:
            worst_pl = unrealised_pl
    
    return worst_pl


def get_mt5_data(account_id, password, server):
    """
    Connects to MT5 and retrieves account info, history and equity.
    Also computes per-trade worst unrealised P/L using OHLC data.
    """
    if not mt5.initialize():
        raise Exception(f"MT5 initialize failed: {mt5.last_error()}")

    # Login
    authorized = mt5.login(account_id, password=password, server=server)
    if not authorized:
        error = mt5.last_error()
        mt5.shutdown()
        raise Exception(f"MT5 login failed: {error}")

    # Account info
    account_info = mt5.account_info()._asdict()
    
    # Get history (all history)
    from_date = datetime(2000, 1, 1)
    to_date = datetime.now()
    
    # Deals (closed trades)
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        deals = []
    
    # Reconstruct positions from deals
    # Position ID links entry and exit deals together
    position_history = {}
    for d in deals:
        d_dict = d._asdict()
        p_id = d_dict['position_id']
        if p_id not in position_history:
            position_history[p_id] = {'in': None, 'out': None}
        
        if d_dict['entry'] == 0:  # entry in
            position_history[p_id]['in'] = d_dict
        elif d_dict['entry'] == 1:  # entry out
            position_history[p_id]['out'] = d_dict

    trades = []
    for p_id, data in position_history.items():
        if data['in'] and data['out']:
            trades.append({
                'ticket': data['in']['position_id'],
                'type': 'buy' if data['in']['type'] == 0 else 'sell',
                'volume': data['out']['volume'],
                'symbol': data['out']['symbol'],
                'open_price': data['in']['price'],
                'close_price': data['out']['price'],
                'open_time': datetime.fromtimestamp(data['in']['time']),
                'close_time': datetime.fromtimestamp(data['out']['time']),
                'profit': data['out']['profit'] + data['out']['commission'] + data['out']['swap']
            })

    # Compute worst unrealised P/L for each trade using OHLC bars
    for trade in trades:
        trade['worst_unrealised_pl'] = _compute_worst_unrealised_pl(trade, mt5)

    # Equity History — reconstructed from deals
    deals_sorted = sorted(deals, key=lambda x: x.time)
    equity_history = []
    current_balance = 0
    
    for d in deals_sorted:
        d_dict = d._asdict()
        current_balance += d_dict['profit'] + d_dict['commission'] + d_dict['swap']
        equity_history.append((datetime.fromtimestamp(d_dict['time']), current_balance))

    # Extended Equity History — includes estimated worst-case equity dips
    # during open positions, not just at deal-close moments.
    # For each trade that went negative, insert a synthetic data point at
    # the trade's open_time showing the worst equity dip.
    extended_equity_history = list(equity_history)  # start with a copy
    
    for trade in trades:
        worst_pl = trade.get('worst_unrealised_pl', 0.0)
        if worst_pl >= 0:
            continue  # Trade never dipped negative, skip
        
        trade_open = trade['open_time']
        
        # Find the equity level at this trade's open time
        # (last equity snapshot at or before the trade opened)
        equity_at_open = equity_history[0][1] if equity_history else 0.0
        for ts, eq in equity_history:
            if ts <= trade_open:
                equity_at_open = eq
            else:
                break
        
        # Insert a synthetic worst-case equity point during the trade
        worst_equity = equity_at_open + worst_pl
        # Place it slightly after open_time so it sorts between open and close
        synthetic_time = trade_open + timedelta(seconds=1)
        extended_equity_history.append((synthetic_time, worst_equity))
    
    # Sort extended history by time
    extended_equity_history.sort(key=lambda x: x[0])

    mt5.shutdown()
    
    return account_info, trades, equity_history, extended_equity_history

def get_mt4_data(account_id, password, server):
    """
    Placeholder for MT4 support. 
    Requires a separate bridge as MT4 doesn't have a native Python API.
    """
    raise Exception("MT4 support requires a custom bridge EA. MT5 is natively supported.")
