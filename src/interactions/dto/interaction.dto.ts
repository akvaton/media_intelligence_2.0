export interface GraphDataItem {
  facebook: number;
  audienceTime: number;
  twitter: number;
}
export type SocialMediaKey = Omit<keyof GraphDataItem, 'audienceTime'>;

export type GraphData = Array<GraphDataItem>;
