/* eslint-disable no-console */
/**
 * # Setup
 * $ npm install
 *
 * # Run in Terminal
 * $ node validate-imsmanifest.js {path-to-package-dir}
 *
 * # Add --fix to auto fix encoded-tag and force-close-tag
 *
 * # Example
 * $ node validate-imsmanifest.js 1111123456789
 *
 * $ node validate-imsmanifest.js 1111222222222 UKBasicScience
 * $ node validate-imsmanifest.js 1111333333333 UKClinicalMedicine
 *
 * $ node validate-imsmanifest.js 1111444444441 USMLEStep1
 * $ node validate-imsmanifest.js 1111444444442 USMLEStep2
 *
 * $ node validate-imsmanifest.js 1111555555551 ESESBasicScience
 * $ node validate-imsmanifest.js 1111555555552 ESESClinicalMedicine
 *
 * $ node validate-imsmanifest.js 1111777777771 ANZBasicScience
 * $ node validate-imsmanifest.js 1111777777772 ANZClinicalMedicine
 *
 * $ node validate-imsmanifest.js 1111888888881 INDBasicScience
 * $ node validate-imsmanifest.js 1111888888882 INDClinicalMedicine
 *
 */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
// const inspect = require('eyes').inspector({ maxLength: false });

const { banks } = require('./banks');
const { utils } = require('./utils');


// // 1. COMBINE Physician topics (Disease)
// const physician2016 = fs.readFileSync('./input/topic-page-mapping/disease/physician_2016.csv').toString().replace(/["]+/g, '').split('\n');
// const physician2019 = fs.readFileSync('./input/topic-page-mapping/disease/physician_2019.csv').toString().replace(/["]+/g, '').split('\n');
// const topicUK = fs.readFileSync('./input/topic-page-mapping/disease/uk.csv').toString().replace(/["]+/g, '').split('\n');
// const physicianAll = physician2016.concat(physician2019);
// const physicianUnique = _.uniq(physicianAll)
//     // .map(item => utils.normalizeStr(item))
//     .map(item => item.toLowerCase().trim())
//     .sort();
// console.log(physicianUnique);
// utils.saveCSV(physicianUnique, 'all-unique', 'physician');

// // 2. TEST using Postman

// // 3. FILTER test results
// const physicianTestReport = require('./output/physician_all_unique_test_report.json')
// const allTests = physicianTestReport.results[0].allTests;
// const failedTests = allTests
//     .filter(obj => Object.values(obj)[0] === false)
//     .map(obj => Object.keys(obj)[0].match(/'(.*?)'/gi)[0].replace(/'/g, ''))
//     .map(item => item.toLowerCase().trim())
//     .sort();
// console.log('physicianTestReport', failedTests);
// utils.saveCSV(failedTests, 'test-failed', 'physician');


// // 4. GENERATE json from passed topics
// const physicianAll = fs.readFileSync('./output/physician_all_unique.csv').toString().replace(/["]+/g, '').split('\n').sort();
// const physicianPassed = fs.readFileSync('./output/physician_all_unique_test_passed.csv').toString().replace(/["]+/g, '').split('\n').sort();
// const physicianFailed = fs.readFileSync('./output/physician_all_unique_test_failed.csv').toString().replace(/["]+/g, '').split('\n').sort();

// const physicianJSON = physicianAll
//     .filter(item => physicianPassed.indexOf(utils.normalizeStr(item)) > -1)
//     .map(item => {
//         return {
//             "name": item,
//             "group": "Disease",
//             "resource": utils.normalizeStr(item)
//         };
//     });
// utils.saveJSON(physicianJSON, 'topic-page-mapping', 'physician');

// // 5. GENERATE XML

const config = {
    checkQuestionTaxonomy: true,
    checkQuestionType: true,
    checkQuestionFormat: true,
    checkQuestionEncodedTag: true,
    checkQuestionCloseTag: true,
    checkQuestionImageExists: true,
    checkDeletedQuestions: false,
    autoFixIssue: false,
    validateQuestionTopicMapping: true,
    generateQuestionTopicMapping: true,

    generateTopicPageMappingFromJSON: true,
    generateQuestionTopicMappingFromJSON: false,
    generateQuestionTopicMappingFromQuestionMappingCSV: false
}

if (config.generateTopicPageMappingFromJSON) {
    const prefix = 'physician';
    const filePath = './output/physician_topic_page_mapping.json';
    const tpmArr = require(filePath);
    utils.generateTopicPageMappingXML(tpmArr, prefix);

}

if (config.generateQuestionTopicMappingFromJSON) {
    const prefix = 'uk';
    const filePath = './archives/uk_question_topic_mapping.json';
    const qtmArr = require(filePath);
    const questionTopics = _.mapValues(_.groupBy(qtmArr, 'vtw_id'), list => list.map(qtm => _.omit(qtm, 'vtw_id')));
    utils.saveJSON(questionTopics, 'question-key-topics', prefix);
    utils.generateQuestionTopicMappingXML(questionTopics, { "isbn": prefix });
}

if (config.generateQuestionTopicMappingFromQuestionMappingCSV) {
    const filePath = './input/question-mapping/UK_to_IND_question_mapping.csv';
    fs.readFile(filePath, 'utf8', function (err, idsCSV) {
        let idsArr = JSON.stringify(idsCSV)
            .replace(/["]+/g, '')
            .split('\\r\\n')
            .map(value => {
                const arr = value.split(',');
                return {
                    "from": arr[0],
                    "to": arr[1]
                };
            });
        console.log('idsArr', idsArr.length, idsArr[0]);

        const header = idsArr.shift();
        const fromPackage = header.from.trim();
        const fromBanks = banks
            .filter(item => item.package == fromPackage)
            .map(bankInfo => utils.getAbsolutePath(bankInfo.path))
            .map(dirPath => utils.getImsManifestXML(dirPath))
            ;
        const toPackage = header.to.trim();
        const toBanks = banks
            .filter(item => item.package == toPackage)
            .map(bankInfo => utils.getAbsolutePath(bankInfo.path))
            .map(dirPath => utils.getImsManifestXML(dirPath))
            ;


        const matchIds = [];
        const mismatchIds = [];

        let fromResources = [];
        let toResources = [];

        const parser = new xml2js.Parser();
        parser.parseString(fromBanks[0], function (err, jsonObj) {
            if (!err) {
                fromResources = fromResources.concat(jsonObj.manifest.resources[0].resource.map(item => item.$));
            }
            parser.parseString(fromBanks[1], function (err, jsonObj) {
                if (!err) {
                    fromResources = fromResources.concat(jsonObj.manifest.resources[0].resource.map(item => item.$));
                }
                parser.parseString(toBanks[0], function (err, jsonObj) {
                    if (!err) {
                        toResources = toResources.concat(jsonObj.manifest.resources[0].resource.map(item => item.$));
                    }
                    parser.parseString(toBanks[1], function (err, jsonObj) {
                        if (!err) {
                            toResources = toResources.concat(jsonObj.manifest.resources[0].resource.map(item => item.$));
                        }

                        // start mapping
                        console.log('fromResources', fromResources.length);
                        console.log('toResources', toResources.length);

                        idsArr.forEach((item, idx) => {
                            const fromFilename = item.from;
                            const toFilename = item.to;
                            const fromObj = _.find(fromResources, ['href', fromFilename]) || _.find(fromResources, ['identifier', fromFilename]);
                            const toObj = _.find(toResources, ['href', toFilename]) || _.find(toResources, ['identifier', toFilename]);
                            if (fromObj && toObj) {
                                idsArr[idx].fromId = fromObj.identifier;
                                idsArr[idx].toId = toObj.identifier;
                                matchIds.push(`${fromObj.identifier},${toObj.identifier}`)
                            }
                            else {
                                mismatchIds.push(`${fromFilename},${toFilename}`)
                                // console.log('[mismatch]', fromFilename, toFilename);
                            }
                        });

                        console.log('--')
                        console.log('matchIds', matchIds.length);
                        console.log('mismatchIds', mismatchIds.length);
                        mismatchIds.forEach(item => console.log('[mismatch]', item));
                    })
                })
            })
        })

    });
}

const debugIdentifier = ['question_MEDED_ESES_MJP166'];
var args = process.argv.slice(2);
const isbn = args[0];
const bankInfo = _.find(banks, ['isbn', isbn]);
config.autoFixIssue = args.indexOf('--fix') > -1;

if (bankInfo) {

    const bankTaxonomies = bankInfo.taxonomies;
    const pathToPackageDir = utils.getAbsolutePath(bankInfo.path);
    const packageName = pathToPackageDir.match(/MEDED_.+?_MedEd$/)[0];
    const bankKeyTopicCatalogs = utils.normalizeArr(bankInfo.keyTopicCatalogs || []);

    console.log('--START Validating...')
    console.log('ISBN', isbn);
    console.log('Package', packageName);
    console.log('--');

    const listQuestionIds = [];
    const listQuestionFiles = [];
    const listQuestionKeyTopics = {};

    fs.readFile(`${pathToPackageDir}/imsmanifest.xml`, 'utf8', function (err, imsManifestXML) {
        if (err) throw err;
        // normalize xml data
        imsManifestXML = imsManifestXML
            .replace(new RegExp('\>\>', 'gm'), '>')
            .replace(new RegExp('imsmd\:', 'gm'), '')
            .replace(new RegExp('imsqti\:', 'gm'), '');

        // normalize taxonomies
        var taxonomiesData = bankTaxonomies;
        _.forEach(taxonomiesData, (value, key) => {
            taxonomiesData[key] = utils.normalizeArr(value);
        })
        const taxonomies = utils.normalizeArr(Object.keys(taxonomiesData));

        const parser = new xml2js.Parser();
        parser.parseString(imsManifestXML, function (err, imsManifestJSON) {
            var resources = imsManifestJSON.manifest.resources[0].resource;
            // console.dir(JSON.stringify(resources));
            var invalid = resources.filter(resource => {
                let isValid = true;
                let isMatchIdentifier = false;
                let hasTaxonomy = false;
                let hasSubTopic = false;
                let hasQuestionType = false;
                let hasQtiData = false;

                if (resource.$.type === 'imsqti_item_xmlv2p1') {
                    const resourceIdentifier = resource.$.identifier;
                    const YAI = resourceIdentifier.replace('question_', 'YAI_');
                    if (resourceIdentifier) listQuestionIds.push(resourceIdentifier);
                    const showDebug = debugIdentifier.indexOf(resourceIdentifier) > -1;

                    const general = resource.metadata[0].lom[0].general[0];
                    const generalIdentifier = general.identifier[0];
                    isMatchIdentifier = resourceIdentifier === generalIdentifier;

                    let catalogEntries = general.catalogentry;
                    // if (showDebug) console.log(inspect(catalogEntries, false, null));

                    /** TAXONOMY */
                    if (config.checkQuestionTaxonomy) {
                        const catalogTaxonomies = (catalogEntries || []).filter(item => {
                            return _.intersection(utils.normalizeArr(item.catalog || []), taxonomies).length;
                        })
                        // if (showDebug) console.log(inspect(catalogTaxonomies, false, null));
                        if (catalogTaxonomies.length) {
                            hasTaxonomy = true;
                            catalogTaxonomies.forEach(item => {
                                const entries = _.flatMap((item.entry || []).map(en => {
                                    return utils.normalizeArr(en.langstring || []);
                                }));
                                const topic = item.catalog[0].trim();
                                const subTopics = _.intersection(entries, taxonomiesData[topic]);
                                hasSubTopic = hasSubTopic || subTopics.length > 0 ? true : false;
                            });
                        }
                    }

                    /** COMPETENCY TESTED */
                    // const catalogCompetencyTested = catalogEntries.filter(item => {
                    //     return _.intersection(utils.normalizeArr(item.catalog), ['competency tested']).length;
                    // })
                    // if (showDebug) console.log(inspect(catalogCompetencyTested, false, null));

                    /** KEYWORDS */
                    // const catalogKeywords = catalogEntries.filter(item => {
                    //     return _.intersection(utils.normalizeArr(item.catalog), ['keywords']).length;
                    // })
                    // if (showDebug) console.log(inspect(catalogKeywords, false, null));

                    /** QUESTION TYPE */
                    if (config.checkQuestionType) {
                        const catalogQuestionType = catalogEntries.filter(item => {
                            return _.intersection(utils.normalizeArr(item.catalog), ['question type']).length;
                        })
                        // if (showDebug) console.log(inspect(catalogQuestionType, false, null));
                        if (catalogQuestionType.length) {
                            catalogQuestionType.forEach(item => {
                                const entries = _.flatMap(item.entry.map(en => {
                                    return utils.normalizeArr(en.langstring);
                                }));
                                const questionType = _.intersection(entries, ['multiple choice']);
                                hasQuestionType = hasQuestionType || questionType.length > 0 ? true : false;
                            });
                        }
                    }
                    else {
                        hasQuestionType = true;
                    }

                    /** QUESTION KEY TOPICS */
                    if (config.generateQuestionTopicMapping && bankKeyTopicCatalogs.length) {
                        const catalogKeyTopics = catalogEntries.filter(item => {
                            return _.intersection(utils.normalizeArr(item.catalog), bankKeyTopicCatalogs).length;
                        })
                        if (showDebug) console.dir(catalogKeyTopics);
                        if (catalogKeyTopics.length) {
                            catalogKeyTopics.forEach(item => {
                                const topicCatalog = item.catalog[0];
                                const topicNames = _.flatMap(item.entry.map(en => {
                                    return utils.normalizeArr(en.langstring);
                                }));
                                if (showDebug) console.log('topicNamespace', topicCatalog);
                                if (showDebug) console.log('topicNames', topicNames);
                                listQuestionKeyTopics[YAI] = (listQuestionKeyTopics[YAI] || []).concat(
                                    topicNames.map(topicName => {
                                        return {
                                            "name": topicName,
                                            "namespace": "Other",
                                            "catalog": topicCatalog
                                        }
                                    })
                                );
                                if (showDebug) console.log(listQuestionKeyTopics[YAI]);
                            });
                        }
                    }

                    /** QUESTION FILE */
                    const fileName = resource.file[0].$.href;
                    const filePath = `${pathToPackageDir}/${fileName}`;
                    listQuestionFiles.push(fileName);
                    hasQtiData = fs.existsSync(filePath);

                    isValid = isMatchIdentifier && hasTaxonomy && hasSubTopic && hasQuestionType && hasQtiData;
                    if (!isValid) {
                        console.log('identifier:', resourceIdentifier);
                        console.log('isMatchIdentifier:', isMatchIdentifier, resourceIdentifier, generalIdentifier)
                        console.log('hasTaxonomy:', hasTaxonomy);
                        console.log('hasSubTopic:', hasSubTopic);
                        console.log('hasQuestionType:', hasQuestionType);
                        console.log('hasQtiData:', hasQtiData);
                        console.log('--');
                    }
                }
                return !isValid;
            });

            const invalidQuestions = invalid.map(item => { return item.$.identifier });
            utils.saveJSON(invalidQuestions, 'invalid-questions', isbn);

            const duplicatedQuestions = _(listQuestionIds.map(q => q.toLowerCase())).groupBy().pickBy(x => x.length > 1).keys().value();
            utils.saveJSON(duplicatedQuestions, 'duplicated-questions', isbn);

            const longIdQuestions = listQuestionIds.filter(item => item.length > 50);
            utils.saveJSON(longIdQuestions, 'long-id-questions', isbn);


            console.log('--');
            console.log('Number of question files:', listQuestionFiles.length);
            console.log('--');

            /** QUESTION DATA */
            if (config.checkQuestionFormat) {
                const listEncodedTag = [];
                const listMissingCloseTag = [];
                const listMissingImages = [];

                listQuestionFiles.forEach((fileName, idx) => {
                    let filePath = `${pathToPackageDir}/${fileName}`;
                    fs.readFile(filePath, 'utf8', function (err, qtiData) {
                        if (err) {
                            console.warn('[file-not-exists]', fileName);
                            // throw err;
                        }

                        if (!qtiData.trim()) {
                            console.warn('[file-is-empty]', fileName);
                        }

                        qtiData = qtiData.replace(/[\r\n]+/g, '').replace(/[\s]+/g, ' ');

                        /** FORMAT XML */
                        if (config.checkQuestionEncodedTag) {
                            const regexEncodedSelfCloseTag = RegExp('&lt;.+?\/&gt;', 'gm');
                            if (regexEncodedSelfCloseTag.test(qtiData)) {
                                const encodedStr = qtiData.match(regexEncodedSelfCloseTag)[0];
                                const decodedStr = _.unescape(encodedStr);
                                // console.warn('[xml-encoded-tag]', fileName, encodedStr, decodedStr);
                                listEncodedTag.push(`${fileName} ${encodedStr} ${decodedStr}`)
                                if (config.autoFixIssue) {
                                    qtiData = qtiData.replace(encodedStr, decodedStr);
                                }
                            }
                            if (idx === listQuestionFiles.length - 1) {
                                console.log('--')
                                console.log('listEncodedTag', listEncodedTag.length);
                                listEncodedTag.forEach(item => {
                                    console.log('[xml-encoded-tag]', item);
                                });
                            }
                        }

                        if (config.checkQuestionCloseTag) {
                            const regexEmptyTagXML = /<modalFeedback .+? showHide="show"\/>/gm;
                            if (regexEmptyTagXML.test(qtiData)) {
                                // console.warn('[xml-no-modalFeedback-close-tag]', fileName);
                                listMissingCloseTag.push(fileName);
                            }
                            if (idx === listQuestionFiles.length - 1) {
                                console.log('--')
                                console.log('listMissingCloseTag', listMissingCloseTag.length);
                                listMissingCloseTag.forEach(item => {
                                    console.log('[xml-no-modalFeedback-close-tag]', item);
                                });
                            }
                        }

                        if (config.checkQuestionImageExists) {
                            const regexImageSrc = /src="([^"]+)"/gmi;
                            let imgSources;
                            while ((imgSources = regexImageSrc.exec(qtiData)) !== null) {
                                // This is necessary to avoid infinite loops with zero-width matches
                                if (imgSources.index === regexImageSrc.lastIndex) {
                                    regexImageSrc.lastIndex++;
                                }
                                let imgName = imgSources[1];
                                let imgPath = `${pathToPackageDir}/${imgName.trim()}`;
                                let imgExists = utils.isFileExistsWithCaseSync(imgPath);
                                if (!imgExists) {
                                    listMissingImages.push(`${fileName} ${imgSources[0]}`);
                                }
                            }
                            if (idx === listQuestionFiles.length - 1) {
                                console.log('--')
                                console.log('listMissingImages', listMissingImages.length);
                                listMissingImages.forEach(item => {
                                    console.log('[img-not-exists]', item);
                                });
                                if (listMissingImages.length > 10) {
                                    fs.writeFile(`${isbn}_missing_images.txt`, listMissingImages.join(',\n'), function (err) {
                                        if (err) console.log(err);
                                    })
                                }
                            }
                        }

                        parser.parseString(qtiData, function (err, qtiJSON) {
                            if (err) {
                                console.warn('[xml2js-format-invalid]', fileName);
                            }
                            else if (qtiJSON) {
                                if (config.autoFixIssue) {
                                    // if (showDebug) console.log(inspect(qtiJSON, false, null));
                                    // re-format xml
                                    const builder = new xml2js.Builder({
                                        renderOpts: {
                                            'pretty': true,
                                            'indent': ' ',
                                            'newline': '\n',
                                            allowEmpty: true
                                        }
                                    });
                                    const xmlData = builder.buildObject(qtiJSON);
                                    fs.writeFile(filePath, xmlData, function (err, qtiXML) {
                                        if (err) console.log(err);
                                    })
                                }
                            }
                        });
                    });
                })
            }

            const yaiQuestionIds = listQuestionIds.map(item => item.replace('question_', 'YAI_').trim());

            /** QUESTION DELETED */
            // fs.readFile(`${isbn}_ocs_questions.txt`, 'utf8', function (err, ocsQuestions) {
            //     if (err) {
            //         console.warn('[file-not-exists]', `${isbn}_ocs_questions.txt`);
            //     }
            //     else {
            //         ocsQuestions = ocsQuestions.split('\n');
            //         const deletedQuestions = _.difference(ocsQuestions, yaiQuestionIds);
            //         console.log('--');
            //         console.log('deletedQuestions', deletedQuestions.length, '\n', deletedQuestions);
            //     }
            // });

            /** QUESTION TOPIC MAPPING */
            if (config.validateQuestionTopicMapping) {
                utils.validateQuestionTopicMappingXML(yaiQuestionIds, `${isbn}_question_topic_mapping.xml`, isbn);
            }

            if (config.generateQuestionTopicMapping && Object.keys(listQuestionKeyTopics).length) {
                utils.saveJSON(listQuestionKeyTopics, 'question-key-topics', isbn);
                utils.generateQuestionTopicMappingXML(listQuestionKeyTopics, bankInfo);
            }

            /** END */
        });
    });
}
