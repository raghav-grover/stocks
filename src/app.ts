import express, { Express } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { RegisterRoutes } from '../tsoa/routes';
import '@database';
import {format, parse, isAfter, subDays, differenceInCalendarDays, addDays} from 'date-fns';
import axios from 'axios';
import { Delivery, DeliveryBucket, Portfolio, ProcessedDelivery } from '@entity/stock';
const Str = require('@supercharge/strings');
import {db} from './database'
import { EntityManager } from 'typeorm';
const http = require('http');


const app: Express = express();

/************************************************************************************
 *                              Basic Express Middlewares
 ***********************************************************************************/

app.set('json spaces', 4);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle logs in console during development
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  app.use(cors());
}

// Handle security and origin in production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

/************************************************************************************
 *                               Register all routes
 ***********************************************************************************/

//RegisterRoutes(app);

const router = express.Router();

router.get('/portfolio', async (req: express.Request, res: express.Response) => {
const portfolio = await Portfolio.find()

portfolio.map(async stock => {
  const response = await axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${stock.symbol}&apikey=RM9BA9NHUTRLW0LP`)
  const data = response.data;
  data['Time Series (Daily)']
})



});

router.get('/ingest/today', async (req: express.Request, res: express.Response) => {
  const dateProcess = format(Date.now(), 'dd-MMM-yyyy') //02-Nov-2022
  const response = await axios.get(`https://www1.nseindia.com/archives/equities/mto/MTO_${dateProcess}.DAT`)





  //console.log(response.status, response.data);
  if(response.status == 200) {

    const items = Str(response.data).lines()
    //console.log(items.length, response.data)

    const deliveryEntities = items.filter((element: any) => element.split(',')[3] == 'EQ').map((element : any) => {
      const del = new Delivery();
     
      del.symbol = element.split(',')[2];
      del.deliveryPercentage = parseFloat(element.split(',')[6])
      del.volume = element.split(',')[4]
      del.date = parse(dateProcess, 'ddMMyyyy', new Date())
      if(del.deliveryPercentage >= 80) {
        del.bucket = DeliveryBucket.ABOVE_80
      }else if(del.deliveryPercentage < 80 && del.deliveryPercentage >= 60) {
        del.bucket = DeliveryBucket.BETWEEN_60_80
      }else if(del.deliveryPercentage < 60 && del.deliveryPercentage >= 50) {
        del.bucket = DeliveryBucket.BETWEEN_50_60
      }else if(del.deliveryPercentage < 50 && del.deliveryPercentage >= 40) {
        del.bucket = DeliveryBucket.BETWEEN_40_50
      }else {
        del.bucket = DeliveryBucket.LESS_THAN_40;
      }
      return del;
    });
    
    //console.log(deliveryEntities);
    await db.connection.createQueryBuilder().insert().into(Delivery).values(deliveryEntities).execute();
  }else {
    console.log('Data not available')
  }
  
  return res.send(dateProcess);
}) 
let stockSelection = `PHARMA/API,AARTIDRUGS,ABBOTINDIA,AJANTPHARM,ALBERTDAVD,ALEMBICLTD,ALKEM,AMRUTANJAN,APLLTD,ASTRAZEN,AUROPHARMA,BLISSGVS,CADILAHC,CAPLIPOINT,CIPLA,DCAL,DIVISLAB,DRREDDY,ERIS,FDC,GLAXO,GLENMARK,GMMPFAUDLR,GRANULES,HESTERBIO,HIKAL,INDOCO,IPCALAB,JBCHEPHARM,JUBILANT,LAURUSLABS,LUPIN,LINCOLN,MOREPENLAB,MARKSANS,NATCOPHARM,NECLIFE,NEULANDLAB,PFIZER,ROSSARI,RPGLIFE,SANOFI,SEQUENT,SMSPHARMA,SOLARA,SPARC,STAR,SUNPHARMA,SUVENPHAR,SUVEN,SYNGENE,TORNTPHARM,UNICHEMLAB,SHILPAMED,PGHH,WOCKPHARMA,JUBLINGREA,GLAND,HOSPITALS/DIAGNOSTICS,APOLLOHOSP,ASTERDM,FORTIS,LALPATHLAB,METROPOLIS,NH,POLYMED,THYROCARE,SPEC CHEM/AGRO CHEM,AARTISURF,AARTIIND,ADVENZYMES,AKSHARCHEM,ALKYLAMINE,APCOTEXIND,ASAHISONG,ASTEC,ATUL,BALAMINES,BASF,BEPL,BHARATRAS,BHAGERIA,BODALCHEM,CAMLINFINE,CLNINDIA,DYNPRO,DEEPAKNTR,PRIVISCL,FINEORG,FLUOROCHEM,GALAXYSURF,GOCLCORP,GUJALKALI,HSCL,IGPL,INDIAGLYCO,IOLCP,KIRIINDUS,MFL,MOL,NAVINFLUOR,NOCIL,OCCL,PANAMAPET,PRAJIND,PODDARMENT,SOLARINDS,SHK,SUDARSCHEM,SUMICHEM,TATACHEM,TIRUMALCHM,UPL,VIDHIING,VINATIORGA,VINYLINDIA,NEOGEN,VALIANTORG,CHEMCON,FMCG,BAJAJCON,BIRLACORPN,BRITANNIA,COLPAL,DAAWAT,DABUR,DFMFOODS,DIAMONDYD,DMART,EMAMILTD,FRETAIL,GODREJCP,HATSUN,HERITGFOOD,HNDFDS,HINDUNILVR,ITC,JUBLFOOD,JYOTHYLAB,KRBL,MARICO,IFBAGRO,NESTLEIND,PARAGMILK,PIDILITIND,TASTYBITE,TATACONSUM,VADILALIND,VENKEYS,ZYDUSWELL,BURGERKING,BANKS,HDFCBANK,ICICIBANK,KOTAKBANK,AXISBANK,SBIN,INDUSINDBK,BANDHANBNK,FEDERALBNK,RBLBANK,IDFCFIRSTB,NBFC/HFI,AAVAS,BAJAJFINSV,AUBANK,BAJFINANCE,CANFINHOME,CHOLAFIN,CREDITACC,EDELWEISS,EQUITAS,LICHSGFIN,M&MFIN,MANAPPURAM,MAXIND,MFSL,MUTHOOTFIN,PEL,REPCOHOME,SPANDANA,UJJIVANSFB,UJJIVAN ,PSU,BHEL,BALMLAWRIE,BEL,BEML,COALINDIA,COCHINSHIP,CONCOR,DREDGECORP,HAL,MSTCLTD,NATIONALUM,NBCC,NCC,NESCO,NLCINDIA,NTPC,SCI,MOBILE SOFTWARE/ELECTONIC,AFFLE,AMBER,DIXON,DLINKINDIA,DEN,HATHWAY,HONAUT,INDIAMART,IRCTC,MAHINDCIE,NAUKRI,OLECTRA,ONMOBILE,TVSELECT,VERTOZ,SOFTWARE / IT,ACCELYA,APTECHT,CYIENT,ECLERX,HCLTECH,INTELLECT,INFY,LTI,LTTS,MASTEK,MPHASIS,NEWGEN,NIITLTD,OFSS,PERSISTENT,QUICKHEAL,RSYSTEMS,SAKSOFT,SONATSOFTW,TATAELXSI,TCS,TANLA,TRIGYN,COFORGE,XCHANGING,INFOBEAN,WIPRO,ZENSARTECH,NUCLEUS,BSOFT,HAPPSTMNDS,XELPMOC,SUBEXLTD,KPITTECH,REDINGTON,ELECTRICITY,ABB,APARINDS,BAJAJELEC,BIRLACABLE,CROMPTON,CUMMINSIND,FINCABLES,GET&D,HAVELLS,IEX,IGARASHI,IFBIND,KEI,PFC,POLYCAB,POWERGRID,SIEMENS,VGUARD,WHIRLPOOL,VOLTAMP,VOLTAS,ORIENTELEC,PIXTRANS,REAL ESTATE,AJMERA,BOMDYEING,BRIGADE,DLF,KOLTEPATIL,OBEROIRLTY,PHOENIXLTD,PRESTIGE,SUNTECK,IBREALEST,ASHIANA,CONSTRUCTION COMPANY,ASHOKA,DBL,JKIL,JMCPROJECT,KALPATPOWR,KEC,KNRCON,PSPPROJECT,SEAMECLTD,SADBHAV,IRB,CEMENT,ACC,AMBUJACEM,APCL,DECCANCE,HEIDELBERG,INDIACEM,JKCEMENT,NCLIND,ORIENTCEM,RAMCOCEM,SAGCEM,SANGHIIND,ULTRACEMCO,SHREDIGCEM,TILES/CERAMICS/BATHROOM,HSIL,POKARNA,NITCO,ORIENTBELL,ASIANTILES,CERA,SHIL,KAJARIACER,SOMANYCERA,SUGAR,ANDHRSUGAR,AVADHSUGAR,BALRAMCHIN,BANARISUG,DALMIASUG,DHAMPURSUG,DWARKESH,EIDPARRY,MAGADSUGAR,MAWANASUG,TRIVENI,ALCOHOL/SOFT DRINKS,GLOBUSSPR,GMBREW,MCDOWELL-N,RADICO,UBL,VBL,CONGLOMERATE SUGAR/CEM,DALBHARAT,KAKATCEM,KCP,DCMSHRIRAM,KESORAMIND,INSURANCE/ BROKING,ABCAPITAL,DOLAT,GEOJITFSL,EMKAY,HDFCAMC,HDFCLIFE,IIFLSEC,ISEC,JMFINANCIL,MOTILALOFS,NIACL,NAM-INDIA,SBILIFE,SBICARD,CAMS,ICICIPRULI,PAINTS,AKZOINDIA,ASIANPAINT,BERGEPAINT,KANSAINER,PLYWOOD,ARCHIDPLY,CENTURYPLY,GREENLAM,GREENPANEL,GREENPLY,PLASTIC ITEMS,APOLLOPIPE,ASTRAL,FINPIPE,KINGFA,NILKAMAL,PRAXIS,SKIPPER,PRINCEPIPE,SUPREMEIND,FERTILISERS/ CROP PROTECTION,BAYERCROP,CHAMBLFERT,COROMANDEL,DEEPAKFERT,DHANUKA,EXCELINDUS,FACT,GODREJAGRO,GNFC,INSECTICID,MADRASFERT,PIIND,RALLIS,RCF,FASHION,ABFRL,ARVIND,ARVINDFASN,CLOTHING,CANTABIL,FLFL,MONTECARLO,RAYMOND,TWO/THREE/FOUR WHEELER,BAJAJ-AUTO,ATULAUTO,FORCEMOT,HEROMOTOCO,MAHSCOOTER,MARUTI,TATAMOTORS,HEAVY VEHICLES,ACE,BHARATFORG,EICHERMOT,ESCORTS,MIDHANI,VSTTILLERS,GUJAPOLLO,SWARAJENG,AUTO COMPONENTS,AUTOAXLES,BALKRISIND,BANCOINDIA,BOSCHLTD,CEATLTD,GABRIEL,GNA,GREAVESCOT,HARITASEAT,JTEKTINDIA,LUMAXTECH,MINDACORP,MRF,MUNJALAU,NRBBEARING,PPAP,PRICOLLTD,PRECAM,RICOAUTO,SCHAEFFLER,SUBROS,SUNDRMFAST,TALBROAUTO,WHEELS,FIEMIND,SHIVAMAUTO,ENDURANCE,MINDAIND,JKTYRE,SSWL,BATTERY,AMARAJABAT,EVEREADY,EXIDEIND,HOLDING COMPANIES,BBTC,BFUTILITIE,BAJAJHLDNG,TELECOM,HFCL,AGCNET,TATACOMM,VINDHYATEL,NELCO,BHARTIARTL,RELIANCE,OIL \ GAS COMPANIES,BPCL,CASTROLIND,CHENNPETRO,GAIL,GUJGASLTD,IGL,IOC,MGL,MRPL,OIL,ONGC,SUPPETRO,PETRONET,OTT/DIGITAL ENTERTAINMENT/THEATRE,BALAJITELE,CINELINE,EROSMEDIA,INOXLEISUR,MUKTAARTS,PVR,SAREGAMA,SHEMAROO,TIPSINDLTD,UFO,RATING AGENCY,CARERATING,CRISIL,ICRA,COOKERS,BUTTERFLY,TTKPRESTIG,FISHERIES/SHRIMPS,AVANTIFEED,WATERBASE,APEX,HOTELS,CHALET,EIHOTEL,INDHOTEL,KAMATHOTEL,LEMONTREE,ORIENTHOT,GRAPHITE RODS/WELDING,ADORWELD,ESABINDIA,GRAPHITE,HEG,PACKAGING,COSMOFILMS,EPL,TCPLPACK,JINDALPOLY,MOLDTKPAC,ORICONENT,POLYPLEX,PREMIERPOL,UFLEX,AC MAKERS,BLUESTARCO,JCHAC,SYMPHONY,PACKEGED FOOD,ADFFOODS,CIGARETTES,GODFRYPHLP,VSTIND,CARBON PRODUCTS,GOACARBON,GRAVITA,PCBL,RAIN,CONSTRUCTION PRODUCTS,EVERESTIND,HIL,INDIANHUME,ITDCEM,MAHSEAMLES,SRIPIPES,VISAKAIND,WELCORP,PAPER,ANDHRAPAP,JKPAPER,EMAMIPAP,ORIENTPPR,HUHTAMAKI,SATIA,SESHAPAPER,STARPAPER,TNPL,WSTCSTPAPR,STEEL,APLAPOLLO,JSWSTEEL,NMDC,TATASTLBSL,JINDALSAW,JSLHISAR,TATASTLLP,TINPLATE,ORISSAMINE,GALLISPAT,JSWISPL,PRAKASH,GPIL,SUNFLAG,SAIL,KIOCL,HINDALCO,TATASTEEL,SARDAEN,TATAMETALI,KSL,JINDALSTEL,JSL,MISCELLANEOUS,AIAENG,ATLASCYCLE,BSE,CARBORUNIV,CDSL,CENTENKA,CENTURYTEX,CUPID,DELTACORP,GODREJIND,GRINDWELL,HIMATSEIDE,KOKUYOCMLN,LAOPALA,LINDEINDIA,LAXMIMACH,LUXIND,MCX,MIRZAINT,MOIL,PAGEIND,RAMCOSYS,RELAXO,QUESS,RSYSTEMS,RSWM,SAFARI,SHAKTIPUMP,SHANTIGEAR,SIS,SKFINDIA,SPICEJET,TEAMLEASE,TIINDIA,TIMKEN,VIPIND,VIPCLOTHNG,VMART,WABAG,IONEXCHANG,SREEL,WESTLIFE,MAITHANALL,KAYA,IMFA,JUSTDIAL,GAEL,DBCORP,REPRO,INFIBEAM,MPSLTD,RITES,VARDHACRLC,KPRMILL,GARFIBRES,JAGRAN,SFL,3MINDIA,MAHEPC,WELSPUNIND,ICIL,TBZ,KOPRAN,VAIBHAVGBL,GOKEX,ORBITEXP,SANGAMIND,ACRYSIL,HINDCOPPER,FILATEX,EKC,ASHAPURMIN,BORORENEW,GLASS,ASAHIINDIA,BOROLTD,HINDNATGLS,RAILWAYS,TEXRAIL,TEXINFRA,TWL,REFRACTORIES,RHIM,VESUVIUS,IFGLEXPOR,TEA/COFFEE,CCL,TATACOFFEE,ROSSELLIND,JAYSREETEA,MCLEODRUSS,TRANSPORT & LOGISTICS,AEGISCHEM,ALLCARGO,FSC,SNOWMAN,TOTAL,TCI,TCIEXP,VRLLOG,IPO,NAZARA,SURYODAY,KALYANKJIL,LXCHEM,CRAFTSMAN,ANURAS,EASEMYTRIP,MTARTECH,HERANBA,RAILTEL,NURECA,HOMEFIRST,INDIGOPNTS,IRFC,AWHCL,BECTORFOOD,UTIAMC,MAZDOCK,ANGELONE,EQUITASBNK,KIMS,CLEAN,TATVA,CARTRADE,LODHA,SONACOMS,TEGA,STOVEKRAFT,MANYAVAR,APLA`;
var getDaysArray = function(start: any, end: any) {
  for(var arr=[],dt=new Date(start); dt<=new Date(end); dt.setDate(dt.getDate()+1)){
      arr.push(new Date(dt));
  }
  return arr;
};


router.get('/report', async (req: express.Request, res: express.Response) => {
  let dates = await db.connection.createQueryBuilder(Delivery, 'delivery')
  .select('DISTINCT ("date") as date')
  .orderBy('date', 'DESC')
  .limit(36)
  .getRawMany();

  let latestavailableDate = dates[0].date;
  const days = Math.abs(differenceInCalendarDays(latestavailableDate, Date.now()))
  //If todays data is missing
  if(days > 0) {
    await dumpMissingData();
  }


  let processingDataMissingFor = 0
  const processingDates = await  db.connection.createQueryBuilder(ProcessedDelivery, 'delivery')
    .select('DISTINCT ("date") as date')
    .orderBy('date', 'DESC')
    .limit(36)
    .getRawMany();

  
  if(processingDates.length > 0) {
    processingDataMissingFor = Math.abs(differenceInCalendarDays(processingDates[0].date, Date.now()))  
  }else{
    processingDataMissingFor = 60
  }

  /*



  */

  try {

  for( let i = 0; i < processingDataMissingFor; i++) {
    const dateProcess = format(subDays(Date.now(), i), 'yyyy-MM-dd')
    console.log('In the beginning of the processed loop')
    await db.connection.transaction(async (tm: EntityManager) => {
      dates = await tm.createQueryBuilder(Delivery, 'delivery')
      .select('DISTINCT ("date") as date')
      .where(`date <= '${dateProcess}'`)
      .orderBy('date', 'DESC')
      .limit(36)
      .getRawMany();

      let today = format(dates[0].date, 'yyyy-MM-dd')
      let lastDayForMA = format(dates[dates.length - 1].date, 'yyyy-MM-dd')
      console.log('Processing the average volume data for', today, lastDayForMA);
      let results = []
      try {

      results = await tm.query(`select todayDelivery.volume, avgVolume, fooa.symbol, bucket, "deliveryPercentage", (todayDelivery.volume / avgVolume) as volumeMultiple from (
        SELECT
          avg(delivery.volume) as avgVolume, delivery.symbol
        FROM
          delivery
          WHERE delivery."date" > '${lastDayForMA}' and delivery."date" <= '${today}' 
          group by delivery.symbol) as fooa INNER JOIN delivery  todayDelivery  ON todayDelivery.symbol = fooa.symbol AND todayDelivery."date" = '${today}' 
          where todayDelivery.volume > fooa.avgVolume 
          ORDER by "deliveryPercentage" DESC
        `, [])
  
        console.log('For processing', today, lastDayForMA, 'the results are ', results.length);
      }catch(ex) {
        console.log('Conitnuing to next execution')
        //continue;
      }
      
      
  
      const mappedResults = results.map((ele: any) => {
        const processedDelivery = new ProcessedDelivery();
        processedDelivery.isSandeepPick =  stockSelection.indexOf(ele.symbol) !== -1
        processedDelivery.bucket = ele.bucket;
        //@ts-ignore
        processedDelivery.date = dates[0].date;
        processedDelivery.deliveryPercentage = ele.deliveryPercentage;
        processedDelivery.symbol = ele.symbol;
        processedDelivery.volumeMultiple = ele.volumemultiple;
        processedDelivery.movingAverageVolume = ele.avgvolume;
        processedDelivery.volume = ele.volume;
  
        return processedDelivery;
      })
  
      try{
        await tm.createQueryBuilder().insert().into(ProcessedDelivery).values(mappedResults).execute();
        console.log('Complete for ', dateProcess, ' Entries processed with averaged volume', mappedResults.length)
      }catch(ex) {
        //console.error(ex)
        console.log('Conitnuing to next execution')
      }

    })
    



  }
  }catch(ex) {
    console.error(ex)
  }

  let results = await db.connection.createQueryRunner().query(`select date, "processedDelivery".bucket, count("processedDelivery".symbol) as stockCount from "processedDelivery" 
  GROUP by date, "processedDelivery".bucket
  ORDER by "date" DESC, stockCount DESC`)

  const todaysAccumalation = await 

  res.send(results);
});

const groupBy = (items: any, key: string) => items.reduce(
  (result: any, item: any) => ({
    ...result,
    [item[key]]: [
      ...(result[item[key]] || []),
      item,
    ],
  }), 
  {},
);

router.get('/ingest/missing', async (req: express.Request, res: express.Response) => {
    await dumpMissingData();
    return res.send('Complete');
})

router.get('/format', async (req: express.Request, res: express.Response) => {
    const x = await db.connection.createQueryRunner().query(`SELECT
    date,
    count("processedDelivery".symbol) AS stockCount, AVG("volumeMultiple")
  FROM
    "processedDelivery"
  WHERE
    "deliveryPercentage" >= 50
  GROUP BY
    date
  ORDER BY
    "date" DESC,
    stockCount DESC`)
  
  console.table(x)


})

app.use(router)

let dumpMissingData = async () => {
  const lastDeliveryData = await Delivery.findOne({order: {'date': 'DESC'}})
  console.log('The last data was calculated on' , lastDeliveryData?.date)
  //@ts-ignore
  const days = Math.abs(differenceInCalendarDays(parse(lastDeliveryData?.date, 'yyyy-MM-dd', new Date()), Date.now()))
  console.log('Missing days are ', days)
  for( let i = 0; i < days; i++) {
    const dateProcess = format(subDays(Date.now(), i), 'ddMMyyyy')
    console.log('fetching for ', dateProcess)
    let response: any = null;
    try{     
      response = await axios.get(`https://www1.nseindia.com/archives/equities/mto/MTO_${dateProcess}.DAT`)
    }catch(ex) {
      console.log('Looks like ', dateProcess, 'is 404')
      continue;
    }

    //console.log(response.status, response.data);
    console.log('Processing for ', dateProcess)
    if(response && response.status == 200) {
      const items = Str(response.data).lines()
      if(items.length < 100) {
        return 
      }
      //console.log(items.length, response.data)

      const deliveryEntities = items.filter((element: any) => element.split(',')[3] == 'EQ').map((element : any) => {
        const del = new Delivery();
      
        del.isSandeepPick =  stockSelection.indexOf(element.split(',')[2]) !== -1
        del.symbol = element.split(',')[2];
        del.deliveryPercentage = parseFloat(element.split(',')[6])
        del.volume = element.split(',')[4]
        del.date = parse(dateProcess, 'ddMMyyyy', new Date())
        if(del.deliveryPercentage >= 80) {
          del.bucket = DeliveryBucket.ABOVE_80
        }else if(del.deliveryPercentage < 80 && del.deliveryPercentage >= 60) {
          del.bucket = DeliveryBucket.BETWEEN_60_80
        }else if(del.deliveryPercentage < 60 && del.deliveryPercentage >= 50) {
          del.bucket = DeliveryBucket.BETWEEN_50_60
        }else if(del.deliveryPercentage < 50 && del.deliveryPercentage >= 40) {
          del.bucket = DeliveryBucket.BETWEEN_40_50
        }else {
          del.bucket = DeliveryBucket.LESS_THAN_40;
        }
        return del;
      });
      
      //console.log(deliveryEntities);
      try{
        await db.connection.createQueryBuilder().insert().into(Delivery).values(deliveryEntities).execute();
        console.log('Complete for ', dateProcess, ' Entries processed', deliveryEntities.length)
      }catch(ex) {
        console.error(ex)
      }
      
    
    }else {
      console.log('Data not available', dateProcess)
    }
    }
}

app.use("/docs", swaggerUi.serve, async (req: express.Request, res: express.Response) => {
  return res.send(swaggerUi.generateHTML(await import("../tsoa/swagger.json")));
});

/************************************************************************************
 *                               Express Error Handling
 ***********************************************************************************/

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ValidateError) {
    console.error(`Caught Validation Error for ${req.path}:`, err.fields);
    return res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
  }
  if (err instanceof Error) {
    return res.status(500).json({
      errorName: err.name,
      message: err.message,
      stack: err.stack || 'no stack defined'
    });
  }
  next();
});

app.use(function notFoundHandler(_req, res: express.Response) {
  return res.status(404).send({ message: "Not Found" });
});

export default app;




    //   console.log('Just about to call')

    //   const response = await axios.get(`https://www.nseindia.com/api/reports`, {
    //     responseType: 'stream',
    //     params: {
    //      type: 'equities',
    //      date: dateProcess,
    //      mode: 'single',
    //      archives: `[{"name":"CM - Security-wise Delivery Positions","type":"archives","category":"capital-market","section":"equities"}]`
    //     } ,  
    //     headers: {
    //          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
    //     },
    //   })

    //   response.headers['set-cookie']
    //   /*
      
    //   */

    //   const stream = response.data;

    //   stream.on('data', (data : any) => {
    //     console.log('bhai ye dekho', data)
    //   })

    //   stream.on('end', () => {
    //     console.log("stream done bhai you have the data");
    // });
     
      //console.log(rest.data);

  //     /*
  //           curl 'https://www.nseindia.com/api/reports?archives=%5B%7B%22name%22%3A%22CM%20-%20Security-wise%20Delivery%20Positions%22%2C%22type%22%3A%22archives%22%2C%22category%22%3A%22capital-market%22%2C%22section%22%3A%22equities%22%7D%5D&date=04-Nov-2022&type=equities&mode=single' \
  // -H 'authority: www.nseindia.com' \
  // -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
  // -H 'accept-language: en-GB,en;q=0.9' \
  // -H 'cache-control: max-age=0' \
  // -H 'cookie: nsit=QDvqDTD-4lop31bB-NdWVE3b; bm_mi=B86ACFB57383F247F8D892A8ACDFAD63~YAAQCmdNaK2ZW3WEAQAAk6TTeBFrDIvamf1HtlRCNw0ciZvhvf23paGn/UwvDmrLe3mVvyw8+/YSBjH4rbSMznDAg9Q68SD28kkW2G22SpAkNLWusfwOP0yl9TQfyD0FNtPZDpcHD6f7DdfdIbltYngu2ediIszEDDpC0L2o57sQunqt6qCstghjSqUqLYmtFR2+8hXqVIYrlZU4Zxq/yYEwB2brtO4CDkrl3w9LvN2cqGi79NdZ3+Pjz6ZIVc2xS3kaF4JDl7ePaJS3mPGxZkrYfNtRJFGmkPTB4Yxs/Gv7uAHBbNiOOjgRRryymGY4xQI3tPsEHVx2XiI=~1; _ga=GA1.1.322476564.1668474448; AKA_A2=A; ak_bmsc=B56B64F26BE67F03AD230FA16B586C16~000000000000000000000000000000~YAAQCmdNaOubW3WEAQAAI7TTeBEhFj4tGXkVoQNn6iJuEH2bsrfYT47hvVyBJaWO35IWRg7O/d1SdqxGMrxCUDmDSh6MIreUipBRZP2eeiGGki1iYY703PxQHQ87ZMmfhRRZboyB6C4/+zOepqkqfPr0POCCRrEUImzvgpskpT4yhY9pkZJNBi14pi4yybQ65edMtSCLJBUWHfrPtq72VOYUcQJi0SaijkgvWid6H/tRQpv9xfPGAhgIaNZQLoD0JhaU+lLAT0MAf9eqzglgW4DX082pcU1DHGTk0eeJsxJ4X/G9aMKcanpDEILxIWBHV8BxujRrRdMm5hcVt3zEikTRzReUXM1VLZKbUPLSzganZhM9rdbOWGBOLoYQLsFNx7CBE3Co7MB4iXxiOH+kanIgftKbW0q5f655g3MjRpPxqF9gkijXFw==; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY2ODQ3NDYwNSwiZXhwIjoxNjY4NDc4MjA1fQ._VYL4UOoV-G7ieGJH-xl0qLX6_nBgyaUN6w82MUvjvo; _ga_PJSKY6CFJH=GS1.1.1668474447.1.1.1668474606.60.0.0; RT="z=1&dm=nseindia.com&si=32bbf7bb-5c45-4792-8ee8-d113568c336b&ss=lahiltvg&sl=2&tt=4lm&bcn=%2F%2F173bf105.akstat.io%2F&ld=3hlj"; bm_sv=A2D8B9DFE809AC53693E4853C1321F3E~YAAQCmdNaL3gW3WEAQAAalXWeBEZolib6Yu+MVuSkMiv06lWC8az6Bd6m/7EdRIbLJf1YZ2Uidtt6e9XglcL6FWOQ44Z+a+Yuj70YhdfOcnSGLf2w4btpCJNQUifMJN1VWOqCvcoN6ZzL/XJmrOBrIoI7llEetLuMEUj7tXwWLpvQchfkrhOL1sc5Ci667IC4KUOnF46RpDxoLro6Zg+6SRWzqhKLNvbd07MzWt9M6PJpOD4XPfLFsR0OWBqvDmEItir~1' \
  // -H 'if-modified-since: Fri, 04 Nov 2022 11:10:14 GMT' \
  // -H 'if-none-match: "13d3decf2383de4f02173217d295e774"' \
  // -H 'sec-ch-ua: "Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"' \
  // -H 'sec-ch-ua-mobile: ?0' \
  // -H 'sec-ch-ua-platform: "macOS"' \
  // -H 'sec-fetch-dest: document' \
  // -H 'sec-fetch-mode: navigate' \
  // -H 'sec-fetch-site: none' \
  // -H 'sec-fetch-user: ?1' \
  // -H 'upgrade-insecure-requests: 1' \
  // -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' \
  // --compressed
  //     */