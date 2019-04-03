const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const request = require('request');

const outputPath = 'output';
const JSESSIONID = 'B808847B17EA7A3E03AF24C2DD544C91';

const normalize = (array) => {
  return array.map(item => { return item.toLowerCase().trim() });
};

const capitalize = (text) => {
  return text.toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
};

// const formatArrayToJsonString = (arr) => {
//   return `[\n${arr.map(item => `"${item}"`).join(',\n')}\n]`;
// };
// const formatArrayToTxt = (arr) => {
//   return `${arr.map(item => `"${item}"`).join(',\n')}`;
// };

const isFileExistsWithCaseSync = (filePath) => {
  try {
    var dir = path.dirname(filePath);
    if (dir === '/' || dir === '.') return true;
    var filenames = fs.readdirSync(dir);
    if (filenames.indexOf(path.basename(filePath)) === -1) {
      return false;
    }
  }
  catch (ex) {
    console.log(filePath, ex);
    return false;
  }
  return isFileExistsWithCaseSync(dir);
}

const isUrlExists = (url, callback) => {
  var cookie = request.cookie(`INDEX=GLOBAL;JSESSIONID=${JSESSIONID}`);
  var headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };
  var options = {
    url: encodeURI(url),
    method: 'HEAD',
    headers: headers
  };
  request.get(options, (err, res, body) => {
    if (err) { return console.log(err); }
    callback(res.statusCode == 200);
  });
};

const isUrlExistsPromise = url => {
  return new Promise((resolve, reject) => isUrlExists(url, (exists) => exists ? resolve(exists) : reject(exists)));
};

const saveJSON = (objData, desc, prefix) => {
  const fileName = `${prefix}_${desc.toLowerCase().replace(new RegExp(/(\s|-)/, 'gm'), '_')}.json`;
  const filePath = path.join(outputPath, fileName);
  const dataLength = Array.isArray(objData) ? objData.length : (Object.keys(objData).length || 0);
  if (dataLength > 0) {
    console.log('--');
    console.log(`>> [${desc}]`, dataLength, dataLength > 10 ? filePath : objData);
    if (dataLength > 10) {
      const dataStr = JSON.stringify(objData, null, 2);
      fs.writeFile(filePath, dataStr, function (err) {
        if (err) console.error(err);
      })
    }
  }
};

const saveXML = (jsonData, desc, prefix) => {
  const fileName = `${prefix}_${desc.toLowerCase().replace(new RegExp(/(\s|-)/, 'gm'), '_')}.xml`;
  const filePath = path.join(outputPath, fileName);
  console.log('--');
  console.log(`>> [${desc}]`, filePath);
  const builder = new xml2js.Builder({
    renderOpts: {
      'pretty': true,
      'indent': ' ',
      'newline': '\n',
      allowEmpty: true
    }
  });
  const xmlData = builder.buildObject(jsonData);
  fs.writeFile(filePath, xmlData, function (err, dataXML) {
    if (err) console.error(err);
  })
};

const validateQuestionTopicMappingXML = (yaiQuestionIds, filePath, prefix) => {
  fs.readFile(`${filePath}`, 'utf8', function (err, qtmXML) {
    if (err) {
      // skip validating
    }
    else {
      const parser = new xml2js.Parser();
      parser.parseString(qtmXML, function (err, qtmJSON) {
        let qtmList = qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'];
        console.log('--');
        console.log('Validating question-topic mappings:', qtmList.length);
        let qtmQuestionIds = qtmList.map(q => {
          return q.$.id.trim();
        })

        const qtmMissing = _.difference(yaiQuestionIds, qtmQuestionIds).map(item => item.replace('YAI_', 'question_').trim());
        saveJSON(qtmMissing, 'question-topic-mapping-missing', prefix);

        const qtmDuplicated = _(qtmQuestionIds).groupBy().pickBy(x => x.length > 1).keys().value();
        saveJSON(qtmDuplicated, 'question-topic-mapping-duplicated', prefix);

        const qtmDeleted = _.difference(qtmQuestionIds, yaiQuestionIds);
        saveJSON(qtmDeleted, 'question-topic-mapping-deleted', prefix);

        // REMOVE all deleted question
        const qtmCleaned = qtmList.filter(q => {
          return qtmDeleted.indexOf(q.$.id.trim()) == -1;
        });
        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'] = qtmCleaned;
        saveXML(qtmJSON, 'question-topic-mapping-cleaned', prefix)
      });
    }
  });
};

const generateQuestionTopicMappingXML = (objQuestionTopics, bankInfo) => {
  let qtmList = []; // qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'];
  _.forEach(objQuestionTopics, (topicNamespaces, qYAI) => {
    const mapping = {
      "$": {
        "id": qYAI
      },
      "topics": [
        {
          "topic": _.flatMap(topicNamespaces, value => value)
            .map(topicName => {
              return {
                "group": "Other",
                "name": topicName
              }
            })
        }
      ]
    };
    qtmList.push(mapping);
  });
  fs.readFile(`exchange-v-1-0.xml`, 'utf8', function (err, qtmXML) {
    if (err) {
      console.warn('[file-not-exists]', `exchange-v-1-0.xml`);
    }
    else {
      const parser = new xml2js.Parser();
      parser.parseString(qtmXML, function (err, qtmJSON) {
        qtmJSON['rec-remediation-data']['created-ts'] = (new Date()).toISOString();
        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['name'] = bankInfo.name;
        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['description'] = bankInfo.description;
        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'] = qtmList;
        delete qtmJSON['rec-remediation-data']['page-domains'];
        saveXML(qtmJSON, 'question-topic-mapping-generated', bankInfo.isbn)
      });
    }
  });
};

const generateTopicPageMappingXML = (arrTopics, prefix) => {
  if (prefix == 'nursing') return;

  const validateUrls = false;
  if (validateUrls) {
    const topicDuplicated = _(arrTopics).groupBy().pickBy(x => x.length > 1).keys().value();
    saveJSON(topicDuplicated, 'topic-page-mapping-duplicated', prefix);

    const validatedTopics = [];
    const noValidTopics = [];
    const validateTopicPromises = arrTopics.slice(0, 10).map(topicName => {
      return isUrlExistsPromise(`https://cd-staging.clinicalkey.com/meded/api/topic/${topicName}`)
        .then(exists => {
          // console.log(exists, topicName);
          validatedTopics.push(topicName);
        })
        .catch(exists => {
          // console.log(exists, topicName);
          noValidTopics.push(topicName);
        });
    });

    Promise.all(validateTopicPromises)
      .then(function () {
        console.log('all dropped)');
        console.log('validatedTopics', validatedTopics.length, validatedTopics);
        console.log('noValidTopics', noValidTopics.length, noValidTopics);
      })
      .catch(console.error);
  }
  const tpmList = (arrTopics || []).map(topicName => {
    return {
      "resource": `/meded/api/topic/${topicName}`, //.replace(/\s/gi, '_')
      "description": '',
      "topics": [
        {
          "topic": {
            "group": "Disease",
            "name": topicName
          }
        }
      ]
    };
  });
  fs.readFile(`exchange-v-1-0.xml`, 'utf8', function (err, qtmXML) {
    if (err) {
      console.warn('[file-not-exists]', `exchange-v-1-0.xml`);
    }
    else {
      const parser = new xml2js.Parser();
      parser.parseString(qtmXML, function (err, qtmJSON) {
        qtmJSON['rec-remediation-data']['created-ts'] = (new Date()).toISOString();
        qtmJSON['rec-remediation-data']['page-domains'][0]['page-domain'][0]['name'] = 'TOPIC';
        qtmJSON['rec-remediation-data']['page-domains'][0]['page-domain'][0]['url-template'] = 'https://ck2-cert.clinicalkey.com';
        qtmJSON['rec-remediation-data']['page-domains'][0]['page-domain'][0]['description'] = '';
        qtmJSON['rec-remediation-data']['page-domains'][0]['page-domain'][0]['pages'][0]['page'] = tpmList;
        delete qtmJSON['rec-remediation-data']['question-banks'];
        saveXML(qtmJSON, 'topic-page-mapping-generated', prefix)
      });
    }
  });
};


exports.utils = {
  normalize,
  capitalize,
  isFileExistsWithCaseSync,
  saveJSON,
  saveXML,
  validateQuestionTopicMappingXML,
  generateQuestionTopicMappingXML,
  generateTopicPageMappingXML
};