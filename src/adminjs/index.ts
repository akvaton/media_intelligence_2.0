import { Feed } from '../feeds/entities/feed.entity';
import { NewsItem } from '../news/entities/news-item.entity';
import { Interaction } from '../interactions/entities/interaction.entity';
import AdminJS, { ActionContext, ActionRequest, NotFoundError } from 'adminjs';
import { join } from 'path';
// This export is needed to avoid dropping the file from the bundle
import Export from './components/Export';
import FacebookData from './components/FacebookData';
import Dashboard from './components/Dashboard';
import ListAction from './utils/custom-news-item-list';
import { bulkDeleteHandler } from './resources/news-item';

export const ADMIN_JS_OPTIONS = {
  rootPath: '/',
  resources: [
    {
      resource: Feed,
      options: {
        parent: null,
      },
    },
    {
      resource: NewsItem,
      options: {
        sort: {
          direction: 'desc',
          sortBy: 'id',
        },
        parent: null,
        actions: {
          list: {
            handler: ListAction.handler,
          },
          bulkDelete: {
            handler: bulkDeleteHandler,
          },
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
            component: AdminJS.bundle('./components/Export.js'),
          },
        },
        properties: {
          deletedAt: {
            isVisible: false,
          },
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
          twitterInteractions: {
            isVisible: { list: true, filter: false, show: true, edit: false },
            type: 'number',
            position: 1001,
          },
          minTwitterInteractions: {
            isVisible: { filter: true },
            type: 'number',
          },
          maxTwitterInteractions: {
            isVisible: { filter: true },
          },
          facebookGraphData: {
            isArray: true,
            isVirtual: true,
            isVisible: { show: true },
            components: {
              show: AdminJS.bundle('./components/FacebookData.js'),
            },
          },
          startIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          endIndex: {
            isVisible: { list: false, filter: false, show: true, edit: true },
            type: 'number',
          },
          id: {
            // isVisible: false,
            isId: true,
          },
        },
      },
    },
    {
      resource: Interaction,
      options: {
        parent: null,
      },
    },
  ],
  branding: {
    logo: false as const,
    companyName: 'Mediarozvidka 2.0',
    favicon: 'https://twemoji.maxcdn.com/2/svg/1f4e3.svg',
  },
  dashboard: {
    component: AdminJS.bundle('./components/Dashboard.tsx'),
  },
};
