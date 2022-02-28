import React, { useEffect } from 'react';
import axios from 'axios';

const GraphData = ({ record }) => {
  useEffect(() => {
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
          series: [{ name: '', data, keys: ['x', 'y'] }],
          plotOptions: { series: { marker: { enabled: true } } },
        });
      });
    });
  }, []);

  const recalculate = () => {
    axios.post(`/articles/recalculate/${record.id}`).then(() => {
      window.location.reload();
    });
  };

  return (
    <div>
      <button onClick={recalculate}>Count Audience Time</button>
      <div id="containerTwitter" />
      <div id="selectedFragmentTwitter" />
      <div id="containerFb" />
      <div id="selectedFragmentFb" />
    </div>
  );
};

export default GraphData;
