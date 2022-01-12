const VALIDATION_URL =
  /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

const isValidUrl = (str: string) => {
  return VALIDATION_URL.test(str);
};

export default isValidUrl;
