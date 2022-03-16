import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GraphData = ({ record }) => {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const fetchAndShowData = () => {
    setLoading(true);
    axios.get(`/articles/${record.id}`).then(({ data }) => {
      const { articleData, graphData } = data;
      const {
        facebookStartIndex,
        facebookEndIndex,
        twitterStartIndex,
        twitterEndIndex,
      } = articleData;
      const fullGraphDataFb = graphData.map((item) => [
        item.audienceTime,
        item.facebook,
      ]);
      const selectedFragmentDataFb = fullGraphDataFb.slice(
        facebookStartIndex - 1,
        facebookEndIndex,
      );
      const fullGraphDataTwitter = graphData.map((item) => [
        item.audienceTime,
        item.twitter,
      ]);
      const selectedFragmentDataTwitter = fullGraphDataTwitter.slice(
        twitterStartIndex - 1,
        twitterEndIndex,
      );

      setLoading(false);
      [
        {
          title: 'Full Graph Twitter',
          id: 'containerTwitter',
          data: fullGraphDataTwitter,
        },
        {
          title: 'Selected Fragment Twitter',
          id: 'selectedFragmentTwitter',
          data: selectedFragmentDataTwitter,
        },
        {
          title: 'Full Graph Facebook',
          id: 'containerFb',
          data: fullGraphDataFb,
        },
        {
          title: 'Selected Fragment Facebook',
          id: 'selectedFragmentFb',
          data: selectedFragmentDataFb,
        },
      ].forEach(({ title, id, data }) => {
        window.Highcharts.chart(id, {
          title: { text: title },
          yAxis: { title: { text: 'Interactions log' }, min: 0 },
          xAxis: {
            title: { text: 'Audience Time log' },
            min: Math.min(...data.map(([x]) => x)),
            tickInterval: 1,
          },
          tooltip: {
            headerFormat: '',
            pointFormatter: function () {
              return `<b>${this.index + 1}</b> <br/> Audience Time log = ${
                this.x
              }, Interactions log = ${this.y}`;
            },
          },
          series: [
            {
              name: '',
              data,
              keys: ['x', 'y'],
              regression: id.includes('selectedFragment') && data.length,
              regressionSettings: {
                name: 'R^2 = %r2',
                type: 'linear',
                lineWidth: 1,
                decimalPlaces: 3,
              },
            },
          ],
          plotOptions: { series: { marker: { enabled: true } } },
        });
      });
    });
  };
  useEffect(() => {
    fetchAndShowData();
  }, []);

  const recalculate = () => {
    setCalculating(true);
    return axios
      .post(`/articles/recalculate/${record.id}`)
      .then(() => {
        setCalculating(false);
        fetchAndShowData();
      })
      .catch((error) => {
        setCalculating(false);
        console.error(error);
        alert('Calculation failed due to an error; Please try again later');
      });
  };

  const getTwitterInteractions = () => {
    if (
      confirm(
        'Are you sure? This will delete all the existing interactions first; New ones may be not collected',
      )
    ) {
      axios
        .post(`/articles/twitter-interactions/${record.id}`)
        .then(() => {
          if (confirm('Interactions collected! Recalculate audience time?')) {
            recalculate();
          }
        })
        .catch(alert);
    }
  };

  return (
    <div>
      <button onClick={getTwitterInteractions}>Get Twitter Interactions</button>
      <button onClick={recalculate} disabled={calculating}>
        Count Audience Time
      </button>
      {loading && 'Loading...'}
      {calculating && <p>Calculating...</p>}
      <div id="containerTwitter" />
      <div id="selectedFragmentTwitter" />
      <div id="containerFb" />
      <div id="selectedFragmentFb" />
    </div>
  );
};

export default GraphData;
