import { Feed } from '../feeds/entities/feed.entity';
import { Article } from '../news/entities/news-item.entity';
import { Interaction } from '../interactions/entities/interaction.entity';
import AdminJS, { AdminJSOptions } from 'adminjs';
import ListAction from './utils/custom-article-list';
import EditAction from './utils/custom-article-edit';
import ExportAction from './utils/action-article-export';
import CalculateRegressionCoefficientAction from './utils/action-article-calculate-potential';
import { AudienceTime } from '../interactions/entities/audience-time.entity';

let lastPosition = 1000;

export const ADMIN_JS_OPTIONS: AdminJSOptions = {
  rootPath: '/',
  assets: {
    scripts: [
      'https://cdn.jsdelivr.net/npm/xlsx@0.17.4/dist/xlsx.full.min.js',
      'https://code.highcharts.com/highcharts.js',
      'https://rawgithub.com/phpepe/highcharts-regression/master/highcharts-regression.js?8',
    ],
  },
  resources: [
    {
      resource: Feed,
      options: { parent: null, sort: { direction: 'desc', sortBy: 'id' } },
    },
    {
      resource: Article,
      options: {
        sort: { direction: 'desc', sortBy: 'id' },
        parent: null,
        actions: {
          list: ListAction,
          edit: EditAction,
          exportData: ExportAction,
          calculateRegressionCoefficient: CalculateRegressionCoefficientAction,
        },
        properties: {
          facebookInteractions: {
            isVisible: { list: true, filter: false, show: true, edit: false },
            type: 'number',
            position: lastPosition++,
          },
          minFacebookInteractions: {
            isVisible: { filter: true },
          },
          maxFacebookInteractions: {
            isVisible: { filter: true },
          },
          minTwitterInteractions: {
            isVisible: { filter: true },
          },
          maxTwitterInteractions: {
            isVisible: { filter: true },
          },
          twitterInteractions: {
            isVisible: { list: true, filter: false, show: true, edit: false },
            type: 'number',
            position: lastPosition++,
          },
          facebookRegression: {
            isVisible: { show: true, list: true },
            position: lastPosition++,
          },
          twitterRegression: {
            isVisible: { show: true, list: true },
            position: lastPosition++,
          },
          graphData: {
            isVisible: { show: true },
            components: {
              show: AdminJS.bundle(
                '../../src/adminjs/components/GraphData.jsx',
              ),
            },
            position: lastPosition++,
          },
          facebookStartIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          facebookEndIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          twitterStartIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          twitterEndIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          link: {
            isVisible: { show: true },
          },
          id: {
            isVisible: { list: true, show: true, filter: true },
          },
          title: {
            isVisible: { edit: false, list: true, show: true, filter: true },
          },
          sourceId: {
            isVisible: { edit: false, list: true, show: true, filter: true },
          },
        },
      },
    },
    {
      resource: Interaction,
      options: { parent: null, sort: { direction: 'desc', sortBy: 'id' } },
    },
    {
      resource: AudienceTime,
      options: { parent: null, sort: { direction: 'desc', sortBy: 'id' } },
    },
  ],
  branding: {
    logo: false as const,
    companyName: 'Mediarozvidka 2.0',
    favicon: 'https://twemoji.maxcdn.com/2/svg/1f4e3.svg',
  },
  dashboard: {
    component: AdminJS.bundle('../../src/adminjs/components/Dashboard.jsx'),
  },
};
