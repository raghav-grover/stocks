from os import sep
from re import A
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
    'scan_clause=(+%7Bcash%7D+(+market+cap+%3E+500+)+)+'
    #'scan_clause=(+%7Bcash%7D+(+market+cap+%3E+500+and+latest+close+%3E+latest+sma(+latest+close+%2C+150+)+and(+latest+sma(+latest+close+%2C+150+)+-+30+days+ago+sma(+latest+close+%2C+150+)+)+%3E+0+and+latest+count(+30%2C+1+where+latest+volume+%2F+latest+sma(+latest+volume+%2C+36+)+%3E+2+)+%3E+3+)+)+'
  ]

output = subprocess.check_output(curl_cmd)
result = json.loads(output.decode())

nseCodes = [d['nsecode'] for d in result['data']]
isFoseco = 'FOSECOIND' in  nseCodes
# print("Is Foseco there ? What about ROTO ?" + isFoseco)
exit
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
    df["DATE1"] = pd.to_datetime(df["DATE1"], format="%d-%b-%Y")
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
exceptionStocks = []
def calculate(symbol):
    # filter the dataframe by the current stock symbol
    stock_df = final_df[final_df['SYMBOL'] == symbol]
    stock_df.sort_values(by=['DATE1'], inplace=True)
    # calculate the ATR for 14 days
    try:
        # Perform some operations that might raise an exception
        atr = talib.ATR(stock_df['HIGH_PRICE'], stock_df['LOW_PRICE'], stock_df['CLOSE_PRICE'], timeperiod=10)
         # calculate the 14-day moving average
        vma = talib.SMA(stock_df['TTL_TRD_QNTY'], timeperiod=36)
        return (symbol, atr, vma)
    except Exception as e:
        exceptionStocks.append(symbol)
        # Handle the exception
        print(f"Error occurred: {e}")
        return (None, None , None)
    # return the symbol, ATR, and moving average data as a tuple
    

executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)

futures = []
for symbol in nseCodes:
    if symbol in nseCodes:
        futures.append(executor.submit(calculate, symbol))

for future in concurrent.futures.as_completed(futures):
    symbol, atr, vma = future.result()
    if symbol == None:
        continue
    # update the final_df dataframe with the ATR and moving average data for the symbol
    final_df.loc[final_df['SYMBOL'] == symbol, 'ATR'] = atr
    final_df.loc[final_df['SYMBOL'] == symbol, 'VMA'] = vma

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
nowTime = pd.Timestamp.now().normalize()
vcpStocks = []

for symbol in nseCodes:
   
    # filter the dataframe by the current stock symbol
    stock_df = final_df[final_df['SYMBOL'] == symbol]
    stock_df.sort_values(by=['DATE1'], inplace=True)
    if symbol in exceptionStocks:
        continue
    # calculate the ATR for 14 days
    df_filtered = stock_df[stock_df['DATE1'] >= last_30_days]

    if len(df_filtered['ATR']) > 45:
        continue

    maxAtr = df_filtered['ATR'].max()
    max_index = df_filtered['ATR'].idxmax()

    if math.isnan(maxAtr):
        continue

    maxAtrTimestamp = df_filtered.loc[max_index, 'DATE1']
    #want atleast 5 days of consolidation.
    delta = pd.Timestamp.now() - maxAtrTimestamp
    if delta < pd.Timedelta(days=5): 
        continue

    
    minAtr = stock_df[(stock_df['DATE1'] >= maxAtrTimestamp)]['ATR'].min()
    percentageAtrDecline = ((maxAtr - minAtr) / maxAtr) * 100
    if percentageAtrDecline < 20:
        continue 

    lower_limit = maxAtrTimestamp - pd.Timedelta(days=40)
    prior_closes = stock_df[(stock_df['DATE1'] >= lower_limit) & (stock_df['DATE1'] <= maxAtrTimestamp)]
    
    if len(prior_closes) > 0:
        min_prior_closes = prior_closes['CLOSE_PRICE'].min()
        max_close = prior_closes['CLOSE_PRICE'].max()
        minCloseDay = prior_closes.loc[prior_closes['CLOSE_PRICE'].idxmin(), 'DATE1']
        maxCloseDay = prior_closes.loc[prior_closes['CLOSE_PRICE'].idxmax(), 'DATE1']
        if  maxCloseDay > minCloseDay and max_close >= min_prior_closes * 1.2:
            vcpStocks.append(symbol)
            print(f"VCP stock found : Max value: {maxAtr}, Timestamp: {maxAtrTimestamp}, symbol {symbol}, minclose ${min_prior_closes} maxClose {max_close} percentageDecline {percentageAtrDecline}")
    




print(vcpStocks)
