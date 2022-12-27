import { Connection, createConnection, SimpleConsoleLogger } from "typeorm";
class Database {

  public connection: Connection;

  constructor() {
    this.connectToDB();
  }

  private connectToDB(): void {
    createConnection({
      type: 'postgres',
      host: "leadxstage.c4u9hyqxirm7.ap-south-1.rds.amazonaws.com",
      port: 5430,
      username: "bloom",
      password: "Lukin123",
      database: "stockdata",
      entities: [
        __dirname + "/entity/*.ts",
        __dirname + "/entity/*.js"
      ],
      synchronize: true,
      logging: false
    }).then(_con => {
      this.connection = _con;
      console.log("Connected to db!!");
    }).catch(console.error)
  }

}


function envString<T>(prodString: T, devString: T): T {
  return process.env.NODE_ENV === 'production' ? prodString : devString
}

export const db = new Database();