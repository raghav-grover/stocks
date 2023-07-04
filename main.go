package main

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"io/ioutil"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type StockData struct {
	Open      float64 `json:"o"`
	High      float64 `json:"h"`
	Low       float64 `json:"l"`
	Close     float64 `json:"c"`
	Volume    float64 `json:"v"`
	Symbol    string  `json:"T"`
	Timestamp int64   `json:"t"`
}

type Results struct {
	Results []StockData `json:"results"`
}

func main() {
	nseDataDownload()
}

type NseStock struct {
	Symbol           string
	Series           string
	OpenPrice        float64
	Atr              float64
	HighPrice        float64
	LowPrice         float64
	ClosePrice       float64
	LastPrice        float64
	PrevClosePrice   float64
	TotalTradedQty   int64
	TotalTradedValue float64
	Date             time.Time
	TotalTrades      int64
	ISIN             string
}

func loadNseData() {
	//First key is stock name, then date and then NSEStock
	stockDataBySymbol := map[string][]NseStock{}
	stockDataByDate := map[time.Time]map[string]NseStock{}
	err := filepath.WalkDir("files/", func(path string, d fs.DirEntry, err error) error {
		if !d.IsDir() && filepath.Ext(path) == ".csv" {
			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			r := csv.NewReader(file)
			for {
				record, err := r.Read()

				if err == io.EOF {
					break
				}
				if err != nil {
					return err
				}
				if record[0] == "SYMBOL" {
					continue
				}
				//if len(record) != 13 {
				//	// skip invalid records
				//	continue
				//}

				if record[1] != "EQ" {
					continue
				}
				tradeDate, _ := time.Parse("02-Jan-2006", record[10])
				stock := NseStock{
					Symbol:           record[0],
					Series:           record[1],
					OpenPrice:        parseFloat(record[2]),
					HighPrice:        parseFloat(record[3]),
					LowPrice:         parseFloat(record[4]),
					ClosePrice:       parseFloat(record[5]),
					LastPrice:        parseFloat(record[6]),
					PrevClosePrice:   parseFloat(record[7]),
					TotalTradedQty:   parseInt(record[8]),
					TotalTradedValue: parseFloat(record[9]),
					Date:             tradeDate,
					TotalTrades:      parseInt(record[11]),
					ISIN:             record[12],
				}
				if _, oka := stockDataBySymbol[stock.Symbol]; !oka {
					stockDataBySymbol[stock.Symbol] = append(stockDataBySymbol[stock.Symbol], stock)
				}

				if _, oka := stockDataByDate[stock.Date]; !oka {
					stockDataByDate[stock.Date] = make(map[string]NseStock)
				}

				stockDataByDate[stock.Date][stock.Symbol] = stock
				//stockDataBySymbol[stock.Symbol][stock.Date] = stock
			}
		}
		return nil
	})
	if err != nil {
		panic(err)
	}
	fmt.Println(stockDataByDate)
}

func calculateATR(ohlc []NseStock) []float64 {
	// define variables for ATR calculation
	var trs []float64
	var atrs []float64
	var tr float64
	var atr float64

	// loop through the data in reverse order, starting from the most recent date
	for i := len(ohlc) - 1; i >= 0; i-- {
		// calculate the true range (tr) for the current date
		if i == len(ohlc)-1 {
			tr = ohlc[i].HighPrice - ohlc[i].LowPrice
		} else {
			h2l := math.Abs(ohlc[i+1].HighPrice - ohlc[i+1].LowPrice)
			h2p := math.Abs(ohlc[i+1].HighPrice - ohlc[i].ClosePrice)
			l2p := math.Abs(ohlc[i+1].LowPrice - ohlc[i].ClosePrice)
			tr = math.Max(h2l, math.Max(h2p, l2p))
		}
		trs = append(trs, tr)

		// if we have calculated 14 true ranges, calculate the ATR and append it to the list of ATRs
		if len(trs) == 14 {
			atr = 0
			for _, t := range trs {
				atr += t
			}
			atr /= 14
			atrs = append(atrs, atr)
			trs = trs[1:]
		}

		// stop looping if we have calculated ATRs for the last 45 days
		if len(atrs) == 45 {
			break
		}
	}

	// reverse the list of ATRs so that they are in chronological order
	for i := 0; i < len(atrs)/2; i++ {
		j := len(atrs) - i - 1
		atrs[i], atrs[j] = atrs[j], atrs[i]
	}

	return atrs
}

func parseFloat(str string) float64 {
	val, _ := strconv.ParseFloat(strings.TrimSpace(str), 64)
	return val
}

func parseInt(str string) int64 {
	val, _ := strconv.ParseInt(strings.TrimSpace(str), 10, 64)
	return val
}

func nseDataDownload() {
	apiUrl := "https://www.nseindia.com/api/reports?archives=[{\"name\":\"CM - Bhavcopy(csv)\",\"type\":\"archives\",\"category\":\"capital-market\",\"section\":\"equities\"}]&type=equities&mode=single"
	apiUrl = "https://www.nseindia.com/api/reports?archives=%5B%7B%22name%22%3A%22CM%20-%20Bhavcopy(csv)%22%2C%22type%22%3A%22archives%22%2C%22category%22%3A%22capital-market%22%2C%22section%22%3A%22equities%22%7D%5D&type=equities&mode=single"
	apiUrl = "https://archives.nseindia.com/content/historical/EQUITIES/%d/%s/cm%d%s%dbhav.csv.zip"
	alreadyExistingCount := 0
	// Calculate the date range
	now := time.Now()
	for i := 0; i < 200; i++ {
		date := now.AddDate(0, 0, -i)
		dateString := date.Format("02-Jan-2006")
		//cpUrl := "https://www.nseindia.com/api/reports?archives=%5B%7B%22name%22%3A%22CM%20-%20Bhavcopy(csv)%22%2C%22type%22%3A%22archives%22%2C%22category%22%3A%22capital-market%22%2C%22section%22%3A%22equities%22%7D%5D&date=09-May-2023&type=equities&mode=single"
		// Set the date parameter in the API URL
		bytesH, _ := os.ReadFile(fmt.Sprintf("files/nse-%s.csv", dateString))
		month := strings.ToUpper(date.Month().String())
		xy := fmt.Sprintf(apiUrl, date.Year(), month, date.Day(), month, date.Year())
		fmt.Println(xy)
		if len(bytesH) > 0 {
			alreadyExistingCount++
			continue
		}
		if alreadyExistingCount > 15 {
			break
		}

		//url := fmt.Sprintf("%s&date=%s", apiUrl, dateString)
		//fmt.Println(cpUrl)
		//fmt.Println(url)
		req, err := http.NewRequest("GET", xy, nil)
		if err != nil {
			panic(err)
		}
		//req.Header.Set("Cookie", "Cookie: _ga_PJSKY6CFJH=GS1.1.1683573037.22.1.1683574094.58.0.0; _ga=GA1.1.692423986.1663191223; RT=\"z=1&dm=nseindia.com&si=f9cb077f-3b0d-4678-be4a-c77ee36d2d60&ss=lhf7y34m&sl=0&se=8c&tt=0&bcn=%2F%2F68794905.akstat.io%2F&ld=m6i3&nu=kpaxjfo&cl=n00x\"; defaultLang=en; nseQuoteSymbols=[{\"symbol\":\"GODREJCP\",\"identifier\":null,\"type\":\"equity\"}]; _gid=GA1.2.1338676827.1683562260; nsit=FQKzjLLXrTySa7ppswE3flgO; ak_bmsc=39024BFDAF12C91F787A7653566B6604~000000000000000000000000000000~YAAQty0tF3Pf9NuHAQAAPtnF/BPmON5d+5n95EtX+owRj+PTNdd26zanWbKslc9tW8n3NujG8Yq6vW52XAxkOU1LYmBvnfT6ctZg9tzceuK+T2ZD0/7DSaCTjuMIfug64DLDpZ7o3uPeNTL1A0cwJY/xwQHp6S9PFWFhefP5wNptsK1j9t/vzqQR+2n/7UGJxYFh1B+FcCnG0c9S/nUNUvk9EeiqDSI3A1/wO5+4Pgw40sFaALEbZDe1MVXzZu162YwMO0GAxXWe0NK+zfLv7HD/u22heRDIdrFn3K61luKuNk3ek4tp8zV6TtCUGdo53g5N9ZXvA4X9h6ESHw2PzLOTlBslWhscp52ZQanoh8GcJId41787e3Fa5r0YVMIcwdjM92Ddz9D/0T9yXTn9qI23Mqr+qoKCQmlPUtW0qvz9yMfL6IUQCRE=; bm_mi=8A9D0256ADC18126E053101EF75616D0~YAAQty0tF0Xe9NuHAQAAw9HF/BNkau4LnnQGk5PbxDlDpGRLhlTReWKCZpGD/aFwQzL+jbbOo/nL53sr4Teqq5yjwfRoWSW9XZ4TqqZ0q0EJq/ixfyirOJKfBGNTyrbV8+Lm7+5J0AR3SHQL8BC4NRhg49RQjjG2jHiXeiSD2Nky8JE4Uzbwo6yUrLhyODk1zs7kaWNDsmtONbqJyUOAfbDyzf8G3WEzOe6C+HCiSidPrCg1Prvykr1JTXmZIo9bzO/tO6iF0C+ivN9xA42p/uKixkAvPCKEALrgrIXzcvRn2AWIqxErTRUNbC3ooyhQeFqgKWPrGvY8SGw=~1; bm_sv=265AB4F8D086082E30485DFC382F560A~YAAQH2dNaFTpzfGHAQAA0jbW/BPba9nDpyzcZDkcyMKo5imcQtYgFHna7DevuLQXVYMUVOUNuAkYIe37V+vTXtSD32qSHkQyA+YPU4Hi3DVZxI5gv+Gv7rVBzcdqSWvaqO9tT4pbRtlwA09ZvkZbg/QBd9XqysBu5cIO0vzOyQCAcEYXf1IgjVKNYiT2A2+VYRqgE4Su2Z3idVL8IEXNcioblK3lP+1uBBjjnGT5vxlOIku5p7P/vLjOLJ6VLBfnRQbC~1; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY4MzU3NDA5MiwiZXhwIjoxNjgzNTgxMjkyfQ.rSPUyGkPXY8sDNjDQqMjuOpJTLnAKCtuISX00VHeX6w; AKA_A2=A")
		//req.Header.Set("Cookie", "_ga_PJSKY6CFJH=GS1.1.1683641873.24.1.1683641909.24.0.0; _ga=GA1.1.692423986.1663191223; RT=\"z=1&dm=nseindia.com&si=f9cb077f-3b0d-4678-be4a-c77ee36d2d60&ss=lhgcwezp&sl=2&se=8c&tt=3jv&bcn=%2F%2F17de4c19.akstat.io%2F&ld=u8h&nu=kpaxjfo&cl=177c\"; _gid=GA1.2.1338676827.1683562260; defaultLang=en; ak_bmsc=FEA9D317D56809447FD0A9DE34D6B5B1~000000000000000000000000000000~YAAQty0tF1mxW9yHAQAALsXgABO9gDjkRcH5s20nMN0qy7d1BNDVZYLK0qNcK8+W7PkdeiF9kZmf5xWCDum5iIM9UFeZz9HP4eEiskZtOsO560MU2nMiW8oFwe6pXYMle9Dyh7fh6vW01X1mRGDN…Jpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY4MzY0MTkwNywiZXhwIjoxNjgzNjQ5MTA3fQ.6NAuTzvP7J4JvQSHhdI2lIlzRGuyXMHv1ffqRgMsxV8; bm_mi=2200E17D60A4D857B13AFEE6BA7FBDFC~YAAQty0tF0+wW9yHAQAA0rvgABOoSKKcgLIubqbRzzTWRt/w/fZfsXtL97wTDbyf4vBnMieuCUc2qT8f4TZdym07+AyC9gCUeREOaZ0OVyBUSTGe/+NhCtOP7UEkGn284rfYa8Ce02jSDJ+Sf+0/HD/eko4c+JLbQZlAUPies5pGlY2eqAStJMbGE8JcVX+CD4FLHmlHdkALAFjPocE5zdFhs3wZgKycWrZICWevGRoKkYauozWy3/yY1HikAq5TyZ/5svRDWwZR1KzOlhsvlVuLXsVfrZe1/zXg2CBmqgwbDFNTNC5WE1MZq26pCvTETAINUmgc0lO6oXs=~1")
		req.Header.Set("Cookie", " _ga_PJSKY6CFJH=GS1.1.1683641873.24.1.1683642247.60.0.0; _ga=GA1.1.692423986.1663191223; RT=\"z=1&dm=nseindia.com&si=f9cb077f-3b0d-4678-be4a-c77ee36d2d60&ss=lhgcx5yd&sl=0&se=8c&tt=0&bcn=%2F%2F17de4c0f.akstat.io%2F&nu=kpaxjfo&cl=9b93\"; _gid=GA1.2.1338676827.1683562260; defaultLang=en; ak_bmsc=FEA9D317D56809447FD0A9DE34D6B5B1~000000000000000000000000000000~YAAQty0tF1mxW9yHAQAALsXgABO9gDjkRcH5s20nMN0qy7d1BNDVZYLK0qNcK8+W7PkdeiF9kZmf5xWCDum5iIM9UFeZz9HP4eEiskZtOsO560MU2nMiW8oFwe6pXYMle9Dyh7fh6vW01X1mRGDNwfKvLz476nUUVQW/zRiwtf36kvQ/kNSAV6XBE0EZDmjT1jZHcw01+Xrv762vA30/o92ag32hoGmp6ZODoPUzD4J76QmKtlqCCrjw8T6exgBAXY/x3ZTdZRUNysWThSUKrM04frX7XHU6C8fofJmRKjBPzb3+iTYJZL62PUhvM8xqYudBFh2UbP/cONcEhgnR2PWoulkJei1xMUkkpGZqtMbB5N3oFmBeLb4XDDi3G+8vFND/MTstANvHq1ucH82k97oOqrHd2nYoaGoT7bEBw8655/EtSB6YaaM=; bm_sv=90CDAB916BE571D85F1975B916640933~YAAQty0tF0m4W9yHAQAAZ//gABPMRfDrc5iUehLKjy8XnnSobSd0ZAZ/OqbFYrwzj10YZ3Twgyxc2fPwPGO8B5xEWsQvVgVhPCsKYYZD61+t7pV2zBNIpINJ8Z4Lo9xdL7QI5uEgPZuZDyOpyCPOqvp5GxLJrsS5RQ4ZWJH+AbYhIkEJ4U86cviMwVbvCsdSn8z2W/rjU5Wj20egHwDb3rMEk3tja65bKp1hGmkq/XvpV+OhT3ufAC8AeBXDk7UrHYpr~1; nsit=-LkJAqnok3FQJIUnbzXZbwXr; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY4MzY0MTkwNywiZXhwIjoxNjgzNjQ5MTA3fQ.6NAuTzvP7J4JvQSHhdI2lIlzRGuyXMHv1ffqRgMsxV8; bm_mi=2200E17D60A4D857B13AFEE6BA7FBDFC~YAAQty0tF0+wW9yHAQAA0rvgABOoSKKcgLIubqbRzzTWRt/w/fZfsXtL97wTDbyf4vBnMieuCUc2qT8f4TZdym07+AyC9gCUeREOaZ0OVyBUSTGe/+NhCtOP7UEkGn284rfYa8Ce02jSDJ+Sf+0/HD/eko4c+JLbQZlAUPies5pGlY2eqAStJMbGE8JcVX+CD4FLHmlHdkALAFjPocE5zdFhs3wZgKycWrZICWevGRoKkYauozWy3/yY1HikAq5TyZ/5svRDWwZR1KzOlhsvlVuLXsVfrZe1/zXg2CBmqgwbDFNTNC5WE1MZq26pCvTETAINUmgc0lO6oXs=~1")
		req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0")
		req.Header.Set("Accept", "*/*")
		req.Header.Set("Accept-Language", "en-US,en;q=0.5")
		req.Header.Set("Accept-Encoding", "gzip, deflate, br")
		req.Header.Set("X-Requested-With", "XMLHttpRequest")
		req.Header.Set("Connection", "keep-alive")
		req.Header.Set("Referer", "https://www.nseindia.com/all-reports")
		req.Header.Set("Host", "www.nseindia.com")
		req.Header.Set("Sec-Fetch-Dist", "empty")
		req.Header.Set("Sec-Fetch-Mode", "cors")
		req.Header.Set("Sec-Fetch-Site", "same-origin")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			continue
		}

		// Read the response body
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {

			panic(err)
		}

		//resp.Body.Close()

		// Open the zip file from memory
		zipReader, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
		if err != nil {
			fmt.Println("Error opening zip file:", err)
			continue
		}

		for _, file := range zipReader.File {
			fmt.Println("Contents of file", file.Name)

			// Open the file from the zip file
			fileReader, err := file.Open()
			if err != nil {
				fmt.Println("Error opening file from zip:", err)
				continue
			}

			outFile, err := os.Create("files/nse-" + dateString + ".csv")
			if err != nil {
				continue
			}

			// Read the contents of the file
			//fileContents, err := ioutil.ReadAll(fileReader)
			//if err != nil {
			//	fmt.Println("Error reading file contents from zip:", err)
			//	continue
			//}

			// Copy the contents of the zip file to the output file
			_, err = io.Copy(outFile, fileReader)
			if err != nil {
				fmt.Println("Error reading file contents from zip 2:", err)
				continue
			}

			// Print the contents of the file
			fmt.Println(string("fileContents"))
			fileReader.Close()
			outFile.Close()
		}
		resp.Body.Close()

		// Print the response body
		fmt.Printf("Data for %s: done", dateString)
	}

}

func extractFile(file *zip.File) error {
	// Open the zip file for reading
	zipFile, err := file.Open()
	if err != nil {
		return err
	}
	defer zipFile.Close()

	// Create the output file
	outFile, err := os.Create(file.Name)
	if err != nil {
		return err
	}
	defer outFile.Close()

	// Copy the contents of the zip file to the output file
	_, err = io.Copy(outFile, zipFile)
	if err != nil {
		return err
	}

	return nil
}

func readFromFiles() {
	// Define the directory where the files are stored
	dir := "./"

	// Create maps to store the stock data for each day
	stockDataByDay := make(map[string]map[string]StockData)

	// Loop over the files in the directory
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Check if the file is a JSON file
		if strings.HasSuffix(path, ".json") {
			// Read the contents of the file
			data, err := ioutil.ReadFile(path)
			if err != nil {
				return err
			}

			// Parse the JSON data into a map
			var jsonData Results
			err = json.Unmarshal(data, &jsonData)
			if err != nil {
				return err
			}

			dateTimestamp := jsonData.Results[0].Timestamp
			t := time.Unix(0, dateTimestamp)
			dateStr := t.Format("2006-01-02")
			if stockDataByDay[dateStr] == nil {
				stockDataByDay[dateStr] = map[string]StockData{}
			}

			// Loop over the data for each day and store it in the maps
			for _, stocks := range jsonData.Results {
				stockDataByDay[dateStr][stocks.Symbol] = stocks
			}
		}

		return nil
	})
	if err != nil {
		panic(err)
	}

	// Print the stock data for each day
	for date, stockData := range stockDataByDay {
		fmt.Println(date)
		for symbol, data := range stockData {
			fmt.Printf("%s: %v\n", symbol, data)
		}
		fmt.Println()
	}

	// Example usage: get the data for a specific stock and date
	date := "2022-01-01"
	symbol := "AAPL"
	stockData := stockDataByDay[date][symbol]
	fmt.Printf("%s on %s: %v\n", symbol, date, stockData)

}

func saveToFiles() {
	apiKey := "_RgGbInhGmNZUjaqiIUCY2LD8M101RK0"
	endpoint := "https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/%s?adjusted=true&apiKey=%s"

	// Get the current date in UTC timezone
	now := time.Now().UTC()

	// Loop over the past 40 days
	for i := 1; i <= 200; i++ {
		// Calculate the date i days ago
		date := now.AddDate(0, 0, -i).Format("2006-01-02")

		// Construct the API URL for the date
		url := fmt.Sprintf(endpoint, date, apiKey)
		filename := fmt.Sprintf("polygon-data-%s.json", date)
		if _, err := ioutil.ReadFile(filename); err == nil {
			break
		}

		// Make an HTTP GET request to the API endpoint
		resp, err := http.Get(url)
		if err != nil || resp.StatusCode != 200 {
			fmt.Println("Error making HTTP request:", err)
			return
		}
		defer resp.Body.Close()

		// Read the response data
		data, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			fmt.Println("Error reading response data:", err)
			return
		}

		// Save the response data to a file
		err = ioutil.WriteFile(filename, data, 0644)
		if err != nil {
			fmt.Println("Error saving response data:", err)
			continue
		}
		time.Sleep(25 * time.Second)
		fmt.Println("Saved response data to file:", filename)
	}
}
