/* eslint-disable no-console */
/**
 * # Setup
 * $ npm install --save-dev lodash fs xml2js eyes
 *
 * # Run in Terminal
 * $ node validate-imsmanifest.js {path-to-package-dir}
 *
 * # Add --fix to auto fix encoded-tag and force-close-tag
 *
 * # Example
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_UKBasicScience_v45_1111222222222_MedEd
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_UKClinicalMedicine_v59_1111333333333_MedEd
 *
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_ANZBasicScience_v7_1111777777771_MedEd
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_ANZClinicalMedicine_v6_1111777777772_MedEd
 *
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_MedEdSample_v19_1111123456789_MedEd
 *
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_INDBasicScience_v2_1111888888881_MedEd
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_INDClinicalMedicine_v3_1111888888882_MedEd
 *
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_USMLEStep1_v30_1111444444441_MedEd
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_USMLEStep2_v26_1111444444442_MedEd
 * #
 */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const inspect = require('eyes').inspector({ maxLength: false });

const { utils } = require(`./utils`);
const { banks } = require(`./banks`);

const config = {
    checkQuestionTaxonomy: true,
    checkQuestionType: true,
    checkQuestionFormat: true,
    checkQuestionEncodedTag: true,
    checkQuestionCloseTag: true,
    checkQuestionImageExists: true,
    checkDeletedQuestions: false,
    autoFixIssue: false,
    generateQuestionKeyTopicsMapping: true
}

const debugIdentifier = ['YAI_MEDED_USMLE1_Anat_0005'];
var args = process.argv.slice(2);
const pathToPackageDir = args[0];
config.autoFixIssue = args.indexOf('--fix') > -1;

const packageName = pathToPackageDir.match(/MEDED_.+?_MedEd$/)[0];
const isbn = packageName.match(/\d{13}/)[0];
console.log('--START Validating...')
console.log('Package', packageName);
console.log('ISBN', isbn);
console.log('--');

const bankInfo = banks[isbn];
const bankTaxonomies = bankInfo.taxonomies;
const bankKeyTopicCatalogs = utils.normalize(bankInfo.keyTopicCatalogs || []);

const listQuestionIds = [];
const listQuestionFiles = [];
const listQuestionKeyTopics = {};

const formatArrayToJsonString = (arr) => {
    return `[\n${arr.map(item => `"${item}"`).join(',\n')}\n]`;
};
const formatArrayToTxt = (arr) => {
    return `${arr.map(item => `"${item}"`).join(',\n')}`;
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

const saveJSON = (objData, desc) => {
    const fileName = `${isbn}_${desc.toLowerCase().replace(new RegExp(/(\s|-)/, 'gm'), '_')}.json`;
    const dataLength = Array.isArray(objData) ? objData.length : (Object.keys(objData).length || 0);
    if (dataLength > 0) {
        console.log('--');
        console.log(`>> [${desc}]`, dataLength, dataLength > 10 ? fileName : objData);
        if (dataLength > 10) {
            const dataStr = JSON.stringify(objData, null, 2);
            fs.writeFile(fileName, dataStr, function (err) {
                if (err) console.error(err);
            })
        }
    }
}

const saveXML = (jsonData, desc) => {
    const fileName = `${isbn}_${desc.toLowerCase().replace(new RegExp(/(\s|-)/, 'gm'), '_')}.xml`;
    console.log('--');
    console.log(`>> [${desc}]`, fileName);
    const builder = new xml2js.Builder({
        renderOpts: {
            'pretty': true,
            'indent': ' ',
            'newline': '\n',
            allowEmpty: true
        }
    });
    const xmlData = builder.buildObject(jsonData);
    fs.writeFile(fileName, xmlData, function (err, dataXML) {
        if (err) console.error(err);
    })
}

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
        taxonomiesData[key] = utils.normalize(value);
    })
    const taxonomies = utils.normalize(Object.keys(taxonomiesData));

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
                // console.log(inspect(catalogEntries, false, null));

                /** TAXONOMY */
                if (config.checkQuestionTaxonomy) {
                    const catalogTaxonomies = catalogEntries.filter(item => {
                        return _.intersection(utils.normalize(item.catalog), taxonomies).length;
                    })
                    // if (showDebug) console.log(inspect(catalogTaxonomies, false, null));
                    if (catalogTaxonomies.length) {
                        hasTaxonomy = true;
                        catalogTaxonomies.forEach(item => {
                            const entries = _.flatMap(item.entry.map(en => {
                                return utils.normalize(en.langstring);
                            }));
                            const topic = item.catalog[0].trim();
                            const subTopics = _.intersection(entries, taxonomiesData[topic]);
                            hasSubTopic = hasSubTopic || subTopics.length > 0 ? true : false;
                        });
                    }
                }

                /** COMPETENCY TESTED */
                // const catalogCompetencyTested = catalogEntries.filter(item => {
                //     return _.intersection(utils.normalize(item.catalog), ['competency tested']).length;
                // })
                // if (showDebug) console.log(inspect(catalogCompetencyTested, false, null));

                /** KEYWORDS */
                // const catalogKeywords = catalogEntries.filter(item => {
                //     return _.intersection(utils.normalize(item.catalog), ['keywords']).length;
                // })
                // if (showDebug) console.log(inspect(catalogKeywords, false, null));

                /** QUESTION TYPE */
                if (config.checkQuestionType) {
                    const catalogQuestionType = catalogEntries.filter(item => {
                        return _.intersection(utils.normalize(item.catalog), ['question type']).length;
                    })
                    // if (showDebug) console.log(inspect(catalogQuestionType, false, null));
                    if (catalogQuestionType.length) {
                        catalogQuestionType.forEach(item => {
                            const entries = _.flatMap(item.entry.map(en => {
                                return utils.normalize(en.langstring);
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
                if (config.generateQuestionKeyTopicsMapping && bankKeyTopicCatalogs.length) {
                    const catalogKeyTopics = catalogEntries.filter(item => {
                        return _.intersection(utils.normalize(item.catalog), bankKeyTopicCatalogs).length;
                    })
                    if (showDebug) console.dir(catalogKeyTopics);
                    if (catalogKeyTopics.length) {
                        catalogKeyTopics.forEach(item => {
                            const topicNamespace = item.catalog[0];
                            const topicNames = _.flatMap(item.entry.map(en => {
                                return utils.normalize(en.langstring);
                            }));
                            if (showDebug) console.log('topicNamespace', topicNamespace);
                            if (showDebug) console.log('topicNames', topicNames);
                            if (!listQuestionKeyTopics[YAI]) {
                                listQuestionKeyTopics[YAI] = {};
                            }
                            listQuestionKeyTopics[YAI][topicNamespace] = (listQuestionKeyTopics[YAI][topicNamespace] || []).concat(topicNames);
                            if (showDebug) console.log(listQuestionKeyTopics[YAI]);
                            if (showDebug) console.log(listQuestionKeyTopics[YAI][topicNamespace]);
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
        saveJSON(invalidQuestions, 'invalid-questions');

        const duplicatedQuestions = _(listQuestionIds.map(q => q.toLowerCase())).groupBy().pickBy(x => x.length > 1).keys().value();
        saveJSON(duplicatedQuestions, 'duplicated-questions');

        const longIdQuestions = listQuestionIds.filter(item => item.length > 50);
        saveJSON(longIdQuestions, 'long-id-questions');

        saveJSON(listQuestionKeyTopics, 'question-key-topics');

        console.log('--');
        console.log('Number of question files:', listQuestionFiles.length);
        console.log('--');

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

        /** QUESTION DATA */
        if (config.checkQuestionFormat) {
            const listEncodedTag = [];
            const listMissingCloseTag = [];
            const listMissingImages = [];

            listQuestionFiles.forEach((fileName, idx) => {
                let filePath = `${pathToPackageDir}/${fileName}`;
                // let qtiData = fs.readFileSync(filePath, 'utf8');
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
                            let imgExists = isFileExistsWithCaseSync(imgPath);
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


        /** QUESTION TOPIC MAPPING */
        fs.readFile(`${isbn}_question_topic_mapping.xml`, 'utf8', function (err, qtmXML) {
            if (err) {
                // console.warn('[file-not-exists]', `${isbn}_question_topic_mapping.xml`);
            }
            else {
                parser.parseString(qtmXML, function (err, qtmJSON) {
                    let qtmList = qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'];
                    console.log('--');
                    console.log('Validating question-topic mappings:', qtmList.length);
                    let qtmQuestionIds = qtmList.map(q => {
                        return q.$.id.trim();
                    })
                    // console.log('mappedQuestionIds', mappedQuestionIds.length, mappedQuestionIds[0]);

                    const qtmMissing = _.difference(yaiQuestionIds, qtmQuestionIds).map(item => item.replace('YAI_', 'question_').trim());
                    saveJSON(qtmMissing, 'question-topic-mapping-missing');

                    const qtmDuplicated = _(qtmQuestionIds).groupBy().pickBy(x => x.length > 1).keys().value();
                    saveJSON(qtmDuplicated, 'question-topic-mapping-duplicated');

                    const qtmDeleted = _.difference(qtmQuestionIds, yaiQuestionIds);
                    saveJSON(qtmDeleted, 'question-topic-mapping-deleted');

                    // REMOVE all deleted question
                    const qtmCleaned = qtmList.filter(q => {
                        return qtmDeleted.indexOf(q.$.id.trim()) == -1;
                    });
                    qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'] = qtmCleaned;
                    saveXML(qtmJSON, 'question-topic-mapping-cleaned')
                });
            }
        });

        if (config.generateQuestionKeyTopicsMapping && Object.keys(listQuestionKeyTopics).length) {
            fs.readFile(`exchange-v-1-0.xml`, 'utf8', function (err, qtmXML) {
                if (err) {
                    console.warn('[file-not-exists]', `exchange-v-1-0.xml`);
                }
                else {
                    parser.parseString(qtmXML, function (err, qtmJSON) {
                        let qtmList = []; // qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'];
                        _.forEach(listQuestionKeyTopics, (topicNamespaces, qYAI) => {
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
                        qtmJSON['rec-remediation-data']['created-ts'] = (new Date()).toISOString();
                        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['name'] = bankInfo.name;
                        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['description'] = bankInfo.description;
                        qtmJSON['rec-remediation-data']['question-banks'][0]['question-bank'][0]['questions'][0]['question'] = qtmList;
                        delete qtmJSON['rec-remediation-data']['page-domains'];
                        saveXML(qtmJSON, 'question-topic-mapping-generated')
                    });
                }
            });
        }

        /** END */
    });
});