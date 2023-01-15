import { AnalyticsMediatorInterface } from './AbstractAnalyticsImplementation';

export default class FakeAnalyticsMediator implements AnalyticsMediatorInterface {
  createEventListener(_: string) {
    return async function () {
      return;
    };
  }

  onRouteChange(_: string, __: any) {
    return;
  }
}
