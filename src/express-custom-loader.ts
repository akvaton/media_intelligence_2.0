/* eslint-disable no-underscore-dangle */
import AdminJS from 'adminjs';
import { Injectable } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';

import { AbstractLoader } from '@adminjs/nestjs';
import { AdminModuleOptions } from '@adminjs/nestjs';
import { ExpressLoader } from '@adminjs/nestjs/src/loaders/express.loader';

@Injectable()
export class ExpressCustomLoader extends AbstractLoader {
  public register(
    admin: AdminJS,
    httpAdapter: AbstractHttpAdapter,
    options: AdminModuleOptions,
  ) {
    // eslint-disable-next-line no-console
    console.log('Custom loader');
    new ExpressLoader().register(admin, httpAdapter, options);
  }
}
