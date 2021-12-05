import { Feed } from '../feeds/entities/feed.entity';
import { NewsItem } from '../news/entities/news-item.entity';
import { Interaction } from '../interactions/entities/interaction.entity';
import AdminJS, { ActionContext, ActionRequest, NotFoundError } from 'adminjs';
import { join } from 'path';
// This export is needed to avoid dropping the file from the bundle
import Export from './components/Export';

export const ADMIN_JS_OPTIONS = {
  rootPath: '/',
  resources: [
    Feed,
    {
      resource: NewsItem,
      options: {
        actions: {
          bulkDelete: {
            handler: async (
              request: ActionRequest,
              response,
              context: ActionContext,
            ) => {
              const { records, resource, h, translateMessage } = context;

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
                await Promise.all(
                  records.map((record) =>
                    record.update({ deletedAt: new Date() }),
                  ),
                );
                return {
                  records: records.map((record) =>
                    record.toJSON(context.currentAdmin),
                  ),
                  notice: {
                    message: translateMessage(
                      'successfullyBulkDeleted',
                      resource.id(),
                      {
                        count: records.length,
                      },
                    ),
                    type: 'success',
                  },
                  redirectUrl: h.resourceUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                  }),
                };
              }
              throw new Error('method should be either "post" or "get"');
            },
          },
          exportData: {
            icon: 'View',
            actionType: 'bulk',
            handler: async (
              request: ActionRequest,
              response,
              context: ActionContext,
            ) => {
              const { records, resource, h, translateMessage } = context;

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
              join(__dirname, './components/Export.jsx'),
            ),
          },
        },
        properties: {
          deletedAt: {
            isVisible: false,
          },
          facebookInteractions: {
            isVisible: { list: true, filter: true, show: true, edit: false },
            type: 'number',
            position: 1000,
          },
          twitterInteractions: {
            isVisible: { list: true, filter: true, show: true, edit: false },
            type: 'number',
            position: 1001,
          },
          facebookGraphData: {
            isVisible: false,
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
            isVisible: false,
          },
        },
      },
    },
    Interaction,
  ],
  branding: {
    logo: false as const,
    companyName: '',
  },
};
