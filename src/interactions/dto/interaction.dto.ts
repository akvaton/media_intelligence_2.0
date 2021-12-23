export class InteractionDto {
  timeOfRequest: Date;
  facebookInteractions: number;
  twitterInteractions: number;
  audienceTime: number;
}

export type GraphData = Array<{
  lnFacebookInteractions: number;
  lnAudienceTime: number;
  lnTwitterInteractions: number;
}>;
