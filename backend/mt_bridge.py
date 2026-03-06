import MetaTrader5 as mt5
from datetime import datetime
import time

def get_mt5_data(account_id, password, server):
    """
    Connects to MT5 and retrieves account info, history and equity.
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
    
    processed_trades = []
    for d in deals:
        d_dict = d._asdict()
        # Entry=0, Out=1
        if d_dict['entry'] == 1: # Deal out (closing)
            # Find matching deal in? Or just use deal record
            # In MT5, deals are better. For simplicity, we want closed positions info.
            # But the user wants 'duration'. We might need to match deals to positions.
            pass

    # A better way for trades: history_orders_get or history_deals_get and then reconstruct
    # Actually, MetaTrader5 has a way to get positions, but we want CLOSED ones.
    
    # Let's get "deals" and filter for those that close a position
    # and find their open time.
    
    # For metric calculation, we need open_time and close_time.
    # In MT5:
    # Position ID is what links entry and exit.
    
    position_history = {}
    for d in deals:
        d_dict = d._asdict()
        p_id = d_dict['position_id']
        if p_id not in position_history:
            position_history[p_id] = {'in': None, 'out': None}
        
        if d_dict['entry'] == 0: # entry in
            position_history[p_id]['in'] = d_dict
        elif d_dict['entry'] == 1: # entry out
            position_history[p_id]['out'] = d_dict

    trades = []
    for p_id, data in position_history.items():
        if data['in'] and data['out']:
            trades.append({
                'ticket': data['in']['position_id'], # Use position ID as ticket for aggregation
                'type': 'buy' if data['in']['type'] == 0 else 'sell',
                'volume': data['out']['volume'],
                'symbol': data['out']['symbol'],
                'open_price': data['in']['price'],
                'close_price': data['out']['price'],
                'open_time': datetime.fromtimestamp(data['in']['time']),
                'close_time': datetime.fromtimestamp(data['out']['time']),
                'profit': data['out']['profit'] + data['out']['commission'] + data['out']['swap']
            })

    # Equity History
    # MT5 doesn't give a direct "equity history" list. 
    # We can reconstruct it from balance starts + deals.
    # OR we can sample it if the terminal is running. 
    # But for "historical" analyzer, we reconstruct from deals.
    
    deals_sorted = sorted(deals, key=lambda x: x.time)
    equity_history = []
    current_balance = 0
    
    for d in deals_sorted:
        d_dict = d._asdict()
        current_balance += d_dict['profit'] + d_dict['commission'] + d_dict['swap']
        equity_history.append((datetime.fromtimestamp(d_dict['time']), current_balance))

    mt5.shutdown()
    
    return account_info, trades, equity_history

def get_mt4_data(account_id, password, server):
    """
    Placeholder for MT4 support. 
    Requires a separate bridge as MT4 doesn't have a native Python API.
    """
    # For now, return mock or error
    raise Exception("MT4 support requires a custom bridge EA. MT5 is natively supported.")
