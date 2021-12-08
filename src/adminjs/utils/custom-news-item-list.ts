import * as flat from 'flat';
import { ActionContext, ListActionResponse } from 'adminjs';
import Filter from './filter';
import { populator } from './populator';
import sortSetter from './sort-setter';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

const PER_PAGE_LIMIT = 500;

export const ListAction = {
  name: 'list',
  isVisible: true,
  actionType: 'resource',
  showFilter: true,
  showInDrawer: false,
  handler: async (
    request,
    response,
    context: ActionContext,
  ): Promise<ListActionResponse> => {
    const { query } = request;
    const { sortBy, direction, filters = {} } = flat.unflatten(query || {});
    const { resource } = context;
    let { page, perPage } = flat.unflatten(query || {});
    if (perPage) {
      perPage = +perPage > PER_PAGE_LIMIT ? PER_PAGE_LIMIT : +perPage;
    } else {
      perPage = 100; // default
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
    const { minFacebookInteractions, maxFacebookInteractions, ...filtersData } =
      filters;

    if (minFacebookInteractions || maxFacebookInteractions) {
      filtersData.facebookInteractions = true;
    }
    const filter = await new Filter(filtersData, resource).populate();

    if (minFacebookInteractions && maxFacebookInteractions) {
      filter.filters['facebookInteractions'].custom = Between(
        minFacebookInteractions,
        maxFacebookInteractions,
      );
    } else if (minFacebookInteractions) {
      filter.filters['facebookInteractions'].custom = MoreThanOrEqual(
        minFacebookInteractions,
      );
    } else if (maxFacebookInteractions) {
      filter.filters['facebookInteractions'].custom = LessThanOrEqual(
        maxFacebookInteractions,
      );
    }

    // @ts-expect-error Poor documentation
    const records = await resource.find(filter, {
      limit: perPage,
      offset: (page - 1) * perPage,
      sort,
    });
    const populatedRecords = await populator(records);
    // eslint-disable-next-line no-param-reassign
    context.records = populatedRecords;
    // @ts-expect-error Poor documentation
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
