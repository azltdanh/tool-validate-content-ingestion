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
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_UKBasicScience_v24_1111222222222_MedEd
 * $ node validate-imsmanifest.js ~/Downloads/MEDED_UKClinicalMedicine_v42_1111333333333_MedEd
 *
 * #
 */
const _ = require('lodash');
const fs = require('fs');
const xml2js = require('xml2js');
const inspect = require('eyes').inspector({
    maxLength: false
});

const config = {
    checkQuestionTaxonomy: true,
    checkQuestionType: true,
    checkQuestionFormat: true,
    checkQuestionEncodedTag: true,
    checkQuestionCloseTag: true,
    checkQuestionImageExists: true,
    checkDeletedQuestions: false,
    autoFixIssue: false,
}

const debugIdentifier = ['question_PAT009-dsc_remed'];
var args = process.argv.slice(2);
const pathToPackageDir = args[0];
config.autoFixIssue = args.indexOf('--fix') > -1;

const packageName = pathToPackageDir.match(/MEDED_.+?_MedEd$/)[0];
const isbn = packageName.match(/\d{13}/)[0];
console.log('--START Validating...')
console.log('Package', packageName);
console.log('ISBN', isbn);
console.log('--')

const listQuestionIds = [];
const listQuestionFiles = [];

const formatArrayToJsonString = (arr) => {
    return `[\n${arr.map(item => `"${item}"`).join(',\n')}\n]`;
};
const formatArrayToTxt = (arr) => {
    return `${arr.map(item => `"${item}"`).join(',\n')}`;
};

fs.readFile(`${pathToPackageDir}/imsmanifest.xml`, 'utf8', function (err, imsManifestXML) {
    if (err) throw err;
    // console.log(inspect(imsManifest, false, null));
    // normalize xml data
    imsManifestXML = imsManifestXML
        .replace(new RegExp('\>\>', 'gm'), '>')
        .replace(new RegExp('imsmd\:', 'gm'), '')
        .replace(new RegExp('imsqti\:', 'gm'), '');
    fs.readFile(`${isbn}_taxonomies.json`, 'utf8', function (err, taxonomiesData) {
        if (err) throw err;
        // normalize taxonomies
        taxonomiesData = JSON.parse(taxonomiesData);
        _.forEach(taxonomiesData, (value, key) => {
            taxonomiesData[key] = value.map(item => { return item.toLowerCase().trim() });
        })
        const taxonomies = Object.keys(taxonomiesData).map(item => { return item.toLowerCase().trim() });
        const parser = new xml2js.Parser();
        parser.parseString(imsManifestXML, function (err, imsManifestJSON) {
            // console.log(inspect(imsManifestJSON, false, null));
            var resources = imsManifestJSON.manifest.resources[0].resource;
            // console.dir(JSON.stringify(resources));
            var invalid = resources.filter(resource => {
                let isValid = true;
                let isMatchIdentifier = false;
                let hasTaxonomy = false;
                let hasSubTopic = false;
                let hasQuestionType = false;
                let hasQtiData = false;
                // console.log(inspect(resource, false, null));
                const resourceIdentifier = resource.$.identifier;
                if (resourceIdentifier) listQuestionIds.push(resourceIdentifier);
                const showDebug = debugIdentifier.indexOf(resourceIdentifier) > -1;
                if (resource.$.type === 'imsqti_item_xmlv2p1') {
                    const general = resource.metadata[0].lom[0].general[0];
                    const generalIdentifier = general.identifier[0];
                    isMatchIdentifier = resourceIdentifier === generalIdentifier;

                    let catalogEntries = general.catalogentry;
                    // console.log(inspect(catalogEntries, false, null));

                    /** TAXONOMY */
                    if (config.checkQuestionTaxonomy) {
                        const catalogTaxonomies = catalogEntries.filter(item => {
                            return _.intersection(item.catalog.map(item => { return item.toLowerCase().trim() }), taxonomies).length;
                        })
                        // if (showDebug) console.log(inspect(catalogTaxonomies, false, null));
                        if (catalogTaxonomies.length) {
                            hasTaxonomy = true;
                            catalogTaxonomies.forEach(item => {
                                const entries = _.flatMap(item.entry.map(en => {
                                    return en.langstring.map(item => { return item.toLowerCase().trim() });
                                }));
                                const topic = item.catalog[0].trim();
                                const subTopics = _.intersection(entries, taxonomiesData[topic]);
                                hasSubTopic = hasSubTopic || subTopics.length > 0 ? true : false;
                            });
                        }
                    }

                    /** COMPETENCY TESTED */
                    // const catalogCompetencyTested = catalogEntries.filter(item => {
                    //     return _.intersection(item.catalog.map(item => { return item.toLowerCase().trim() }), ['competency tested']).length;
                    // })
                    // if (showDebug) console.log(inspect(catalogCompetencyTested, false, null));

                    /** KEYWORDS */
                    // const catalogKeywords = catalogEntries.filter(item => {
                    //     return _.intersection(item.catalog.map(item => { return item.toLowerCase().trim() }), ['keywords']).length;
                    // })
                    // if (showDebug) console.log(inspect(catalogKeywords, false, null));

                    /** QUESTION TYPE */
                    if (config.checkQuestionType) {
                        const catalogQuestionType = catalogEntries.filter(item => {
                            return _.intersection(item.catalog.map(item => { return item.toLowerCase().trim() }), ['question type']).length;
                        })
                        // if (showDebug) console.log(inspect(catalogQuestionType, false, null));
                        if (catalogQuestionType.length) {
                            catalogQuestionType.forEach(item => {
                                const entries = _.flatMap(item.entry.map(en => {
                                    return en.langstring.map(item => { return item.toLowerCase().trim() });
                                }));
                                const questionType = _.intersection(entries, ['multiple choice']);
                                hasQuestionType = hasQuestionType || questionType.length > 0 ? true : false;
                            });
                        }
                    }
                    else {
                        hasQuestionType = true;
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
            // console.log(inspect(invalid, false, null));
            const invalidQuestions = invalid.map(item => { return item.$.identifier });
            console.log('invalidQuestions', invalidQuestions.length, invalidQuestions);
            console.log('--');
            const duplicatedQuestions = _(listQuestionIds).groupBy().pickBy(x => x.length > 1).keys().value();
            console.log('duplicatedQuestions', duplicatedQuestions.length, duplicatedQuestions.length > 10 ? `${isbn}_duplicated.json` : duplicatedQuestions);
            if (duplicatedQuestions.length > 10) {
                fs.writeFile(`${isbn}_duplicated.json`, formatArrayToJsonString(duplicatedQuestions), function (err) {
                    if (err) console.log(err);
                })
            }

            console.log('--');
            const longQuestionIds = listQuestionIds.filter(item => item.length > 50);
            console.log('longQuestionIds', longQuestionIds.length, longQuestionIds.length > 10 ? `${isbn}_long_ids.json` : longQuestionIds);
            if (longQuestionIds.length > 10) {
                fs.writeFile(`${isbn}_long_ids.json`, formatArrayToJsonString(longQuestionIds), function (err) {
                    if (err) console.log(err);
                })
            }

            console.log('--');
            console.log('listQuestionFiles', listQuestionFiles.length);
            console.log('--');

            /** QUESTION DELETED */
            // fs.readFile(`${isbn}_ocs_questions.txt`, 'utf8', function (err, ocsQuestions) {
            //     if (err) {
            //         console.warn('[file-not-exists]', `${isbn}_ocs_questions.txt`);
            //     }
            //     else {
            //         ocsQuestions = ocsQuestions.split('\n');
            //         const deletedQuestions = _.difference(ocsQuestions, listQuestionIds.map(item => item.replace('question_', 'YAI_').trim()));
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
                        // const regexEncodedFullCloseTag = RegExp('&lt;(\w*)\b[^&gt;]*&gt;(.*?)&lt;\/\1&gt;', 'gm');

                        if(config.checkQuestionCloseTag){
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
                                let imgExists = fs.existsSync(imgPath);
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

                // console.log('--');
                // console.log('listQuestionMissingImage', listQuestionMissingImage.length, listQuestionMissingImage);
            }

            /** END */
        });
    });
});