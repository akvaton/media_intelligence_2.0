import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

const CalculateRegressionCoefficient = (props) => {
  const history = useHistory();

  useEffect(() => {
    const articlesIds = props.records.map(({ params }) => {
      return params.id;
    });

    axios
      .post(
        `/articles/calculate-interactive-potential/${articlesIds.join(',')}`,
      )
      .then((response) => {
        const failedOnes = response?.data?.filter(
          (item) => item.twitterRegression === -2,
        );

        if (failedOnes?.length) {
          alert(
            `Some articles (ids: ${failedOnes
              .map(({ id }) => id)
              .join(',')}) are failed to process`,
          );
        }
        history.goBack();
      })
      .catch((e) => {
        alert(`An error occurred! ${e}`);
      });
  }, []);

  return <h2>Loading...</h2>;
};

export default CalculateRegressionCoefficient;
