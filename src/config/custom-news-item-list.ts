import * as flat from 'flat';
import { Action, ActionContext, ActionResponse } from 'adminjs';
import Filter from './adminjs/filter';
import { populator } from './adminjs/populator';
import sortSetter from './adminjs/sort-setter';
import { In, MoreThan } from 'typeorm';
// import { RecordJSON } from '../../../frontend/interfaces';

const PER_PAGE_LIMIT = 500;
/**
 * @implements Action
 * @category Actions
 * @module ListAction
 * @description
 * Returns selected Records in a list form
 * @private
 */
export const ListAction = {
  name: 'list',
  isVisible: true,
  actionType: 'resource',
  showFilter: true,
  showInDrawer: false,
  /**
   * Responsible for returning data for all records.
   *
   * To invoke this action use {@link ApiClient#recordAction}
   *
   * @implements Action#handler
   * @memberof module:ListAction
   * @return {Promise<ListActionResponse>} records with metadata
   */
  handler: async (request, response, context: ActionContext) => {
    const { query } = request;
    const { sortBy, direction, filters = {} } = flat.unflatten(query || {});
    const { resource } = context;
    let { page, perPage } = flat.unflatten(query || {});
    if (perPage) {
      perPage = +perPage > PER_PAGE_LIMIT ? PER_PAGE_LIMIT : +perPage;
    } else {
      perPage = 10; // default
    }
    page = Number(page) || 1;
    const listProperties = resource.decorate().getListProperties();
    const firstProperty = listProperties.find((p) => p.isSortable());
    let sort;
    if (firstProperty) {
      sort = sortSetter(
        { sortBy, direction },
        firstProperty.name(),
        resource.decorate().options,
      );
    }
    // filters['facebookInteractions'] = 1;
    const filter = await new Filter(filters, resource).populate();

    if (filters.facebookInteractions) {
      // @ts-ignore
      filter.filters['facebookInteractions'].custom = {
        where: { id: MoreThan(10) },
      };
    }
    // filter.filters['facebookInteractions'].custom = MoreThan(0);

    // @ts-ignore
    const records = await resource.find(filter, {
      limit: perPage,
      offset: (page - 1) * perPage,
      sort,
    });
    const populatedRecords = await populator(records);
    // eslint-disable-next-line no-param-reassign
    context.records = populatedRecords;
    // @ts-ignore
    const total = await resource.count(filter);
    return {
      meta: {
        total,
        perPage,
        page,
        direction: sort.direction,
        sortBy: sort.sortBy,
      },
      records: populatedRecords.map((r) => r.toJSON(context.currentAdmin)),
    };
  },
};
export default ListAction;
