import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const ExportInteractions = (props) => {
  const history = useHistory();

  useEffect(() => {
    const newsData = props.records.map(({ params }) => {
      const { title, link, facebookRegression, twitterRegression } = params;

      return {
        title,
        link,
        facebookRegression,
        twitterRegression,
      };
    });
    const workSheet = XLSX.utils.json_to_sheet(newsData);
    const workBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workBook, workSheet, 'newsData');
    XLSX.writeFile(workBook, 'newsData.xlsx');
    history.goBack();
  }, []);

  return <div />;
};

export default ExportInteractions;
