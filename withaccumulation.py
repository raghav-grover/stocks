from os import sep
from re import A, S
from tokenize import Special
from typing import final
import pandas as pd
import glob
from datetime import datetime, timedelta
import talib
import concurrent.futures
import requests
import subprocess
import json
import math
from tabulate import tabulate
from sklearn.linear_model import LinearRegression
import numpy as np

#Historical data for sectors.
#curl 'https://www.niftyindices.com/Backpage.aspx/getHistoricaldatatabletoString' -X POST -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Accept-Language: en-US,en;q=0.5' -H 'Accept-Encoding: gzip, deflate, br' -H 'Content-Type: application/json; charset=utf-8' -H 'X-Requested-With: XMLHttpRequest' -H 'Origin: https://www.niftyindices.com' -H 'Connection: keep-alive' -H 'Referer: https://www.niftyindices.com/reports/historical-data' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: same-origin' --data-raw $'{\'name\':\'NIFTY IT\',\'startDate\':\'01-Jan-2023\',\'endDate\':\'05-Jun-2023\'}'

vicinity_stocks = {
    'PURVA': 95,
    'ASHOKLEY': 150,
    'BHARATFORG': 810,
    'GAIL': 113,
    'BAJFINANCE':6500,
    'ICICIBANK': 960,
    'IOC': 87,
    'NTPC': 182,
    'POWERGRID': 240,
    'PRESTIGE': 515,
    'SUNDARMFIN': 2441,
}

# set the number of days to calculate ATR over
atr_period = 50

# set the number of days to calculate the average ATR over
avg_atr_period = 14

# create an empty DataFrame to store the results
results_df = pd.DataFrame(columns=["Symbol", "ATR"])

url_get = "https://chartink.com/csrf-token/refresh"
headers_get = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.5",
    "DNT": "1",
    "Connection": "keep-alive",
    "Referer": "https://chartink.com/screener/stage-2-uptrend-26",
    "TE": "Trailers",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty"
}
response_get = requests.get(url_get, headers=headers_get)

ci_session = response_get.cookies.get("ci_session")
xsrf_token = response_get.cookies.get("XSRF-TOKEN")


toks = response_get.json()["token"]
# url_post = "https://chartink.com/screener/process"
# headers_post = {
#     "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
#     "Accept": "application/json, text/javascript, */*; q=0.01",
#     "Accept-Language": "en-US,en;q=0.5",
#     "Accept-Encoding": "identity",
#     "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
#     "X-Requested-With": "XMLHttpRequest",
#     "Origin": "https://chartink.com",
#     "DNT": "1",
#     "Connection": "keep-alive",
#     "Referer": "https://chartink.com/screener/stage-2-uptrend-26",
#     "TE": "Trailers",
#     "X-CSRF-TOKEN": toks,
# }
# data_post = {
#     "scan_clause": "(+%7Bcash%7D+(+market+cap+%3E+500+and+latest+close+%3E+latest+sma(+latest+close+%2C+150+)+and(+latest+sma(+latest+close+%2C+150+)+-+30+days+ago+sma(+latest+close+%2C+150+)+)+%3E+0+and+latest+count(+30%2C+1+where+latest+volume+%2F+latest+sma(+latest+volume+%2C+36+)+%3E+2+)+%3E+3+)+)+"
#     }
# response_post = requests.post(url_post, headers=headers_post, data=data_post, cookies={"ci_session": ci_session, "XSRF-TOKEN": xsrf_token})

# curl_command = ['curl', '-X', 'POST', '-d', '{"key": "value"}', 'https://example.com/api/data']


def callChartInk(scanClause):
    curl_cmd = [
        "curl",
        "https://chartink.com/screener/process",
        "-X",
        "POST",
        "-H",
        "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
        "-H",
        "Accept: application/json, text/javascript, */*; q=0.01",
        "-H",
        "Accept-Language: en-US,en;q=0.5",
        "-H",
        "Accept-Encoding: identity",
        "-H",
        "Content-Type: application/x-www-form-urlencoded; charset=UTF-8",
        "-H",
        "X-CSRF-TOKEN: {0}".format(toks),
        "-H",
        "X-Requested-With: XMLHttpRequest",
        "-H",
        "Origin: https://chartink.com",
        "-H",
        "DNT: 1",
        "-H",
        "Connection: keep-alive",
        "-H",
        "Referer: https://chartink.com/screener/stage-2-uptrend-26",
        "-H",
        "Cookie: ci_session={0}; XSRF-TOKEN={1}".format(ci_session, xsrf_token),
        "-H",
        "Sec-Fetch-Dest: empty",
        "-H",
        "Sec-Fetch-Mode: cors",
        "-H",
        "Sec-Fetch-Site: same-origin",
        "-H",
        "TE: trailers",
        "--data-raw",
        "scan_clause={0}".format(scanClause)
        #'scan_clause=(+%7Bcash%7D+(+market+cap+%3E+500+and+latest+close+%3E+latest+sma(+latest+close+%2C+150+)+and(+latest+sma(+latest+close+%2C+150+)+-+30+days+ago+sma(+latest+close+%2C+150+)+)+%3E+0+and+latest+count(+30%2C+1+where+latest+volume+%2F+latest+sma(+latest+volume+%2C+36+)+%3E+2+)+%3E+3+)+)+'
    ]
    output = subprocess.check_output(curl_cmd)
    result = json.loads(output.decode())
    return result



result = callChartInk('(+%7Bcash%7D+(+market+cap+%3E+500+)+)+')
nseCodes = [d['nsecode'] for d in result['data']]
uptrend = callChartInk('(+%7Bcash%7D+(+market+cap+%3E+500+and+latest+close+%3E+latest+sma(+latest+close+%2C+150+)+and(+latest+sma(+latest+close+%2C+150+)+-+40+days+ago+sma(+latest+close+%2C+150+)+)+%3E+0+)+)+')
uptrendStocks = [d['nsecode'] for d in uptrend['data']]

# nseCodes = ['ANANTRAJ']
isFoseco = 'FOSECOIND' in  nseCodes
# print("Is Foseco there ? What about ROTO ?" + isFoseco)
def compute_atr(df, period):
    # Convert the timestamp column to datetime format

    # Drop any rows with missing values
    df.dropna(inplace=True)
    

    # Sort the dataframe by timestamp in ascending order
    df.sort_values(by=['SYMBOL', 'DATE1'], inplace=True)

    # Calculate the true range (TR) for each day
    df['ATR'] = talib.ATR(df['HIGH_PRICE'], df['LOW_PRICE'], df['CLOSE_PRICE'], timeperiod=period)

    return df

df_list = []    

# loop through each file in the directory
for filename in glob.glob("./newfiles/*.csv"):
    # read the CSV file into a DataFrame
    # SYMBOL,SERIES,OPEN,HIGH,LOW,CLOSE,LAST,PREVCLOSE,TOTTRDQTY,TOTTRDVAL,TIMESTAMP,TOTALTRADES,ISIN
    # SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS, NO_OF_TRADES, DELIV_QTY, DELIV_PER

    df = pd.read_csv(filename, index_col=False, skiprows=1 ,header=0, names=["SYMBOL", "SERIES", "DATE1", "PREV_CLOSE", "OPEN_PRICE", "HIGH_PRICE", "LOW_PRICE", "LAST_PRICE", "CLOSE_PRICE", "AVG_PRICE", "TTL_TRD_QNTY", "TURNOVER_LACS", "NO_OF_TRADES", "DELIV_QTY", "DELIV_PER"])
    df = df.drop(df.columns[-1], axis=1)
    # print(df["SYMBOL"].tolist()) 
    # convert the Timestamp column to a datetime object
    df["DATE1"] = pd.to_datetime(df["DATE1"].str.strip(), format="%d-%b-%Y")
    df = df[df['SYMBOL'].isin(nseCodes)]
    df_list.append(df)
    # calculate the True Range using the previous day's close
    #df["TR"] = df[["HIGH", "CLOSE", "LOW", "PREVCLOSE"]].apply(lambda x: max(x[0:3]) - min(x[0:3]) if x[3] is None else (max(x[0:3], x[3]) - min(x[0:3])), axis=1)

    # calculate the Average True Range over the specified period
    #df["ATR"] = talib.SMA(df["TR"], timeperiod=atr_period)

    # calculate the average ATR over the specified period
    #df["AvgATR"] = df["ATR"].rolling(avg_atr_period).mean()

# print the results
final_df = pd.concat(df_list, ignore_index=True)

def calculate_relative_strength(stock_prices, reference_prices, period):
    stock_prices_sorted = stock_prices.sort_values('DATE1')
    reference_prices_sorted = reference_prices.sort_values('DATE1')

    base_symbol = stock_prices_sorted['CLOSE_PRICE']
    comparative_symbol = reference_prices_sorted['CLOSE_PRICE']

    relative_strength = base_symbol / base_symbol.shift(period) / \
                        (comparative_symbol / comparative_symbol.shift(period)) - 1
    relative_strength_df = pd.DataFrame({'Relative Strength': relative_strength})
    return relative_strength_df

# rs = calculate_relative_strength(final_df[final_df['SYMBOL'] == 'COROMANDEL'],final_df[final_df['SYMBOL'] == 'GSFC'], 14)
# print(rs)

def calculate(symbol):
    # filter the dataframe by the current stock symbol
    stock_df = final_df[final_df['SYMBOL'] == symbol]
    stock_df.sort_values(by=['DATE1'], inplace=True)

    if symbol == 'NIFTY':
        return (None, None, None, None)

    if stock_df['HIGH_PRICE'].empty:
        return (None, None, None, None)
    
    # calculate the ATR for 14 days
    atr = talib.ATR(stock_df['HIGH_PRICE'], stock_df['LOW_PRICE'], stock_df['CLOSE_PRICE'], timeperiod=10)

    # calculate the 14-day moving average
    cma = talib.SMA(stock_df['CLOSE_PRICE'], timeperiod=150)
    vma = talib.SMA(stock_df['TTL_TRD_QNTY'], timeperiod=36)

    # return the symbol, ATR, and moving average data as a tuple
    return (symbol, atr, cma, vma)

executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)

futures = []
for symbol in nseCodes:
    if symbol in nseCodes:
        futures.append(executor.submit(calculate, symbol))

for future in concurrent.futures.as_completed(futures):
    #print(f'The symbol is {symbol}')
    symbol, atr, cma, vma = future.result()
    if symbol != None:
        # update the final_df dataframe with the ATR and moving average data for the symbol
        final_df.loc[final_df['SYMBOL'] == symbol, 'ATR'] = atr
        final_df.loc[final_df['SYMBOL'] == symbol, 'VMA'] = vma
        final_df.loc[final_df['SYMBOL'] == symbol, 'CMA'] = cma

#see if it needs to be removed.
# for symbol in nseCodes:
   
#     # filter the dataframe by the current stock symbol
#     stock_df = final_df[final_df['SYMBOL'] == symbol]
#     stock_df.sort_values(by=['DATE1'], inplace=True)
    
#     # calculate the ATR for 14 days
#     atr = talib.ATR(stock_df['HIGH_PRICE'], stock_df['LOW_PRICE'], stock_df['CLOSE_PRICE'], timeperiod=14)

#     # calculate the 14-day moving average
#     ma = talib.SMA(stock_df['CLOSE_PRICE'], timeperiod=2)

#     # add the ATR and moving average data to the atr_df dataframe
#     final_df.loc[final_df['SYMBOL'] == symbol, 'ATR'] = atr
#     final_df.loc[final_df['SYMBOL'] == symbol, 'MA'] = ma

last_30_days = pd.Timestamp.now().normalize() - pd.Timedelta(days=45)
last_14_days = pd.Timestamp.now().normalize() - pd.Timedelta(days=14)
last_10_days = pd.Timestamp.now().normalize() - pd.Timedelta(days=10)
nowTime = pd.Timestamp.now().normalize()
vcpStocks = []
vcpStocksSpecial = []
stockMap = {}
stockMapScore = {}

my_triggers = []
vicinity_threshold = 0.02
# for symbol in nseCodes:
#     if symbol == 'NIFTY':
#         continue
#     stock_df = final_df[final_df['SYMBOL'] == symbol]
#     stock_df.sort_values(by=['DATE1'], inplace=True)
#     latest_cma = stock_df['CMA'].tail(1).values[0]
#     latest_stock_price = stock_df['CLOSE_PRICE'].tail(1).values[0]
#     percentage_difference = abs((latest_stock_price - latest_cma) / latest_cma * 100)

#     if percentage_difference <= 10:
#         #now go 10 days back and check if the there is a large volume
#         df_filtered = stock_df[(stock_df['DATE1'] >= last_10_days) & (stock_df['TTL_TRD_QNTY']> (2 * stock_df['VMA']))]
#         # x = np.arange(len(stock_df['VMA'])).reshape(-1, 1)
#         # y = vma.values.reshape(-1, 1)

#         # # Fit the linear regression model
#         # regression_model = LinearRegression().fit(x, y)

#         # # Get the slope of the regression line
#         # slope = regression_model.coef_[0][0]
#         if len(df_filtered) > 4:
#             print(f'Stage 2 entering stock found {len(df_filtered)} : {symbol} . Average is {latest_cma}')

for symbol in nseCodes:
   
    # filter the dataframe by the current stock symbol
    if symbol == 'NIFTY' or symbol == 'PTCIL':
        continue
    stock_df = final_df[final_df['SYMBOL'] == symbol]
    stock_df.sort_values(by=['DATE1'], inplace=True)
    # latest_stock_price = stock_df['CLOSE_PRICE'].tail(1).values[0]
    # if symbol in vicinity_stocks:
    #     vicinity_target = vicinity_stocks[symbol]
    #     if abs(latest_stock_price - vicinity_target) / vicinity_target <= vicinity_threshold:
    #         if symbol in vicinity_stocks:
    #                my_triggers.append(f'symbol : {symbol} target: {vicinity_target}')


    latestClose = stock_df

    # calculate the ATR for 14 days
    df_filtered = stock_df[stock_df['DATE1'] >= last_30_days]

    if df_filtered['ATR'].empty:
        continue

    if len(df_filtered['ATR']) > 45:
        continue

    maxAtr = df_filtered['ATR'].max()
    max_index = df_filtered['ATR'].idxmax()

    if math.isnan(maxAtr):
        continue

    maxAtrTimestamp = df_filtered.loc[max_index, 'DATE1']
    close_at_atr = df_filtered.loc[max_index, 'CLOSE_PRICE']
    # this is for accumulation stocks

    #accumulated = df_filtered[(df_filtered['TTL_TRD_QNTY'] > df_filtered['VMA']) & (df_filtered['DELIV_PER'] > 50)]
    #print(f'This stock is calcluated for {len(df_filtered)}')

    #want atleast 5 days of consolidation.
    delta = pd.Timestamp.now() - maxAtrTimestamp
    if delta < pd.Timedelta(days=14): 
        continue

    
    minAtr = stock_df[(stock_df['DATE1'] >= maxAtrTimestamp)]['ATR'].min()
    percentageAtrDecline = ((maxAtr - minAtr) / maxAtr) * 100
    if percentageAtrDecline < 20:
        continue 

    lower_limit = maxAtrTimestamp - pd.Timedelta(days=40)
    prior_closes = stock_df[(stock_df['DATE1'] >= lower_limit) & (stock_df['DATE1'] <= maxAtrTimestamp)]
    after_closes = stock_df[(stock_df['DATE1'] >= maxAtrTimestamp)]
    threshold = 0.05 * after_closes['CLOSE_PRICE'].std()
    #After close max and min should not be more than 15%, so that the stocks who have declined are filtered.
    after_closes_min = stock_df[(stock_df['DATE1'] >= maxAtrTimestamp)]['CLOSE_PRICE'].min()
    after_closes_max = stock_df[(stock_df['DATE1'] >= maxAtrTimestamp)]['CLOSE_PRICE'].max()
    if ((after_closes_max - after_closes_min ) /after_closes_max )* 100 > 15:
        continue

    compression_close = stock_df[(stock_df['DATE1'] >= last_14_days)]
    specialCount = 0
    if len(prior_closes) > 0:
        min_prior_closes = prior_closes['CLOSE_PRICE'].min()
        max_close = prior_closes['CLOSE_PRICE'].max()
        minCloseDay = prior_closes.loc[prior_closes['CLOSE_PRICE'].idxmin(), 'DATE1']
        maxCloseDay = prior_closes.loc[prior_closes['CLOSE_PRICE'].idxmax(), 'DATE1']

        maxCompressionClose = compression_close['CLOSE_PRICE'].max()
        if  maxCloseDay > minCloseDay and max_close >= min_prior_closes * 1.2:
            stockMap[symbol] = {}
            stockMap[symbol]['uptrend'] = int(symbol in uptrendStocks) * 1
            stockMap[symbol]['priorRise'] = (max_close / min_prior_closes)
            stockMapScore[symbol] = 0
            for price in after_closes['CLOSE_PRICE']:
                 if (close_at_atr / price) > 0.95 and (close_at_atr / price) < 1.05:
                    specialCount = specialCount + 1
            stockMap[symbol]['compression'] = specialCount / len(after_closes)
            #stockMap[symbol]['compressionQty'] = (len(prior_closes) / 45) * 2
            stockMapScore[symbol] = stockMap[symbol]['compression'] + stockMap[symbol]['uptrend'] + stockMap[symbol]['priorRise'] 
            final_df.loc[final_df['SYMBOL'] == symbol, 'VCP'] = True
        
            print(f"VCP stock found : Max value: {maxAtr}, symbol {symbol}, minclose ${min_prior_closes} maxClose {max_close} percentageDecline {percentageAtrDecline}")
    
sorted_map = sorted(stockMapScore.items(), key=lambda x: x[1])
keys_array = [key for key, value in sorted_map]
print(keys_array)
print('-----')
#print(stockMap)
print('Listing trigger stocks')
print(my_triggers)

# new_df = pd.DataFrame(stockMap)
# table = tabulate(new_df, headers='keys', showindex=False, tablefmt='fancy_grid')
# print(table)