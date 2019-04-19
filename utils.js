const _ = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const request = require('request');
const normalize = require('normalize-text');

const outputPath = 'output';
const JSESSIONID = 'B808847B17EA7A3E03AF24C2DD544C91';
const TOPIC_NAMESPACE = ['Anatomy', 'Clinical Finding', 'Disease', 'Drug', 'Event', 'Organism', 'Other', 'Physical Object', 'Procedure', 'Specialty', 'Substance', 'Symptom'];

const getAbsolutePath = (pathStr) => {
  return pathStr.replace('~', os.homedir());
};

const getImsManifestXML = (dirPath) => {
  const imsManifestXML = fs.readFileSync(`${dirPath}/imsmanifest.xml`)
    .toString()
    .replace(new RegExp('\>\>', 'gm'), '>')
    .replace(new RegExp('imsmd\:', 'gm'), '')
    .replace(new RegExp('imsqti\:', 'gm'), '');
  return imsManifestXML;
}

const parseImsManifestResources = (xmlStr) => {
  return new Promise(function (resolve, reject) {
    const parser = new xml2js.Parser();
    parser.parseString(xmlStr, function (err, jsonObj) {
      const resources = jsonObj.manifest.resources[0].resource.map(item => item.$);
      resolve(resources);
    })
  });
}

const normalizeStr = (str) => {
  const text = normalize.normalizeDiacritics(str)
    .toLowerCase()
    .replace(',', '')
    .replace('\'s', '')
    .replace('\'', '')
    .replace('/', ' ')
    .replace('_', ' ')
    ;
  return normalize.normalizeWhitespaces(text);
}

const normalizeArr = (array) => {
  return array.map(item => { return item.toLowerCase().trim() });
};

const capitalize = (text) => {
  return text.toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
};

const validateTopicNamespace = (topicNamespace) => {
  if (_.includes(TOPIC_NAMESPACE, capitalize(topicNamespace))) {
    return capitalize(topicNamespace);
  }
  else {
    return 'Other';
  }
}

// const formatArrayToJsonString = (arr) => {
//   return `[\n${arr.map(item => `"${item}"`).join(',\n')}\n]`;
// };
const formatArrayToTxt = (arr) => {
  return `${arr.map(item => `"${item}"`).join(',\n')}`;
};
const formatArrayToCSV = (arr) => {
  return `${arr.map(item => `"${item}"`).join('\n')}`;
};

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

const saveCSV = (objData, desc, prefix) => {
  const fileName = `${prefix}_${desc.toLowerCase().replace(new RegExp(/(\s|-)/, 'gm'), '_')}.csv`;
  const filePath = path.join(outputPath, fileName);
  const dataLength = Array.isArray(objData) ? objData.length : (Object.keys(objData).length || 0);
  if (dataLength > 0) {
    console.log('--');
    console.log(`>> [${desc}]`, dataLength, dataLength > 10 ? filePath : objData);
    if (dataLength > 10) {
      const dataStr = formatArrayToCSV(objData);
      fs.writeFile(filePath, dataStr, function (err) {
        if (err) console.error(err);
      })
    }
  }
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
  _.forEach(objQuestionTopics, (topics, qYAI) => {
    const mapping = {
      "$": {
        "id": qYAI
      },
      "topics": [
        {
          "topic": topics.map(topic => {
            return {
              "group": validateTopicNamespace(topic.namespace),
              "name": topic.name
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
  const tpmList = (arrTopics || []).map(item => {
    return {
      "resource": `/meded/api/topic/${item.resource}`,
      "description": '',
      "topics": [
        {
          "topic": {
            "group": item.group,
            "name": item.name
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
  getAbsolutePath,
  getImsManifestXML,
  parseImsManifestResources,
  normalizeStr,
  normalizeArr,
  capitalize,
  isFileExistsWithCaseSync,
  saveCSV,
  saveJSON,
  saveXML,
  validateQuestionTopicMappingXML,
  generateQuestionTopicMappingXML,
  generateTopicPageMappingXML
};