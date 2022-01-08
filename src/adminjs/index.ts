import { Feed } from '../feeds/entities/feed.entity';
import { Article } from '../news/entities/news-item.entity';
import { Interaction } from '../interactions/entities/interaction.entity';
import AdminJS, {
  ActionContext,
  ActionRequest,
  AdminJSOptions,
  NotFoundError,
} from 'adminjs';
import ListAction from './utils/custom-article-list';
import EditAction from './utils/custom-article-edit';

export const ADMIN_JS_OPTIONS: AdminJSOptions = {
  rootPath: '/',
  assets: {
    scripts: [
      'https://cdn.jsdelivr.net/npm/xlsx@0.17.4/dist/xlsx.full.min.js',
      'https://code.highcharts.com/highcharts.js',
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
          exportData: {
            icon: 'View',
            actionType: 'bulk',
            handler: async (
              request: ActionRequest,
              response,
              context: ActionContext,
            ) => {
              const { records, resource, h } = context;
              if (!records || !records.length) {
                throw new NotFoundError(
                  'no records were selected.',
                  'Action#handler',
                );
              }
              if (request.method === 'get') {
                const recordsInJSON = records.map((record) =>
                  record.toJSON(context.currentAdmin),
                );
                return {
                  records: recordsInJSON,
                };
              }
              if (request.method === 'post') {
                return {
                  records: records.map((record) =>
                    record.toJSON(context.currentAdmin),
                  ),
                  redirectUrl: h.resourceUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                  }),
                };
              }
              throw new Error('method should be either "post" or "get"');
            },
            component: AdminJS.bundle(
              '../../src/adminjs/components/Export.jsx',
            ),
          },
        },
        properties: {
          facebookInteractions: {
            isVisible: { list: true, filter: false, show: true, edit: false },
            type: 'number',
            position: 1000,
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
          facebookRegression: {
            isVisible: { show: true },
          },
          twitterRegression: {
            isVisible: { show: true },
          },
          twitterInteractions: {
            isVisible: { list: true, filter: false, show: true, edit: false },
            type: 'number',
            position: 1001,
          },
          graphData: {
            isVisible: { show: true },
            components: {
              show: AdminJS.bundle(
                '../../src/adminjs/components/GraphData.jsx',
              ),
            },
            position: 999,
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
            isVisible: { list: true, show: true },
          },
        },
      },
    },
    {
      resource: Interaction,
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
