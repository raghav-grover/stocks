import { Body, Controller, Delete, Get, Post, Put, Query, Route, Tags } from 'tsoa';
import axios from 'axios';
import date from 'date-fns';

@Route('/ingest')
export class UserPermissionController extends Controller {

  @Get('/today')
  public async getAllUser() {
    const today = date.format(new Date(), 'DDMMYYY')
    return today;
  }

  @Get('/previous/{date}')
  public async createUser(@Query('date') date: string) {
    
    //
  }

  @Put('/update/{id}/')
  public async updateUser(@Query('id') id: string, @Body() body: { email: string, roles: string[] }) {
  
  }

  @Delete('/delete/{id}/')
  public async deleteUser(@Query('id') id: string) {
  }

}

