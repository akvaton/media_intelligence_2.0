import AdminJS, { ActionContext, ActionRequest, NotFoundError } from 'adminjs';

export const ExportAction = {
  icon: 'View',
  actionType: 'bulk',
  handler: async (request: ActionRequest, response, context: ActionContext) => {
    const { records, resource, h } = context;
    if (!records || !records.length) {
      throw new NotFoundError('no records were selected.', 'Action#handler');
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
        records: records.map((record) => record.toJSON(context.currentAdmin)),
        redirectUrl: h.resourceUrl({
          resourceId: resource._decorated?.id() || resource.id(),
        }),
      };
    }
    throw new Error('method should be either "post" or "get"');
  },
  component: AdminJS.bundle('../../../src/adminjs/components/Export.jsx'),
};

export default ExportAction;
