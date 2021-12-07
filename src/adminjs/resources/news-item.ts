import { ActionContext, ActionRequest, NotFoundError } from 'adminjs';

export const bulkDeleteHandler = async (
  request: ActionRequest,
  response,
  context: ActionContext,
) => {
  const { records, resource, h, translateMessage } = context;

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
    await Promise.all(
      records.map((record) => record.update({ deletedAt: new Date() })),
    );
    return {
      records: records.map((record) => record.toJSON(context.currentAdmin)),
      notice: {
        message: translateMessage('successfullyBulkDeleted', resource.id(), {
          count: records.length,
        }),
        type: 'success',
      },
      redirectUrl: h.resourceUrl({
        resourceId: resource._decorated?.id() || resource.id(),
      }),
    };
  }
  throw new Error('method should be either "post" or "get"');
};
