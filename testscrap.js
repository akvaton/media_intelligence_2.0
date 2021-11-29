const fs = require('fs');
const axios = require('axios');
// import axios from 'axios';
const iconv = require('iconv-lite');

// const root = parse('<ul id="list"><li>Hello World</li></ul>');

// const { JSDOM } = jsdom;
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const vgmUrl = 'http://top.bigmir.net/';

axios
  .get(vgmUrl, { responseType: 'arraybuffer', responseEncoding: 'binary' })
  .then((response) => {
    // const root = parse(response.data);
    const decoded = iconv.decode(Buffer.from(response.data), 'windows-1251');

    const dom = new JSDOM(response.data);

    console.log(
      dom.window.document.querySelector(
        '#container_main > div.page2.g-clearfix > div.doublecol.normal.fr > table:nth-child(3) > tbody > tr:nth-child(18) > td:nth-child(2)',
      ).textContent,
    );
  })
  .catch((err) => {
    console.log(err);
  });
