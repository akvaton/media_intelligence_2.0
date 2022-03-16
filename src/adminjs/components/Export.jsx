import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const ExportInteractions = (props) => {
  const history = useHistory();

  useEffect(() => {
    const newsData = props.records.map(({ params, populated }) => {
      const {
        title,
        link,
        pubDate,
        twitterRegression,
        facebookRegression,
        twitterInteractions,
      } = params;
      const { sourceId } = populated;
      const { name } = sourceId.params;

      return {
        ['Title']: title,
        ['Link']: link,
        ['Publication Date']: pubDate,
        ['Twitter interactive potential']: twitterRegression,
        ['Facebook interactive potential']: facebookRegression,
        ['Source Feed']: name,
        ['Twitter interactions']: twitterInteractions,
      };
    });
    const workSheet = XLSX.utils.json_to_sheet(newsData);
    const workBook = XLSX.utils.book_new();
    const date = new Date().toISOString();

    XLSX.utils.book_append_sheet(workBook, workSheet, `Export ${date}`);
    XLSX.writeFile(workBook, `Export ${date}.xlsx`);
    history.goBack();
  }, []);

  return <div />;
};

export default ExportInteractions;
