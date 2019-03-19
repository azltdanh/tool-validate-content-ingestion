// const _ = require('lodash');
const fs = require('fs');
var pgp = require('pg-promise')(/*options*/);
const xml2js = require('xml2js');
const inspect = require('eyes').inspector({
    maxLength: false
});

var cn = {
    host: 'localhost', // server name or IP address;
    port: 5433,
    database: 'reccontent',
    user: 'postgres',
    password: ''
};
// alternative:
// var cn = 'postgres://username:password@host:port/database';

var pageDomains = [];

var db = pgp(cn); // database instance;

// select and return user name from id:
db.query('SELECT id, name, namespace, hgraph_id FROM reccontent.topic WHERE id = $1', 31)
    .then(topics => {
        console.log(topics); // print user name;
        var pages = topics.map(t => {
            return {
                'page-domain': {
                    name: 'images',
                    'url-template': 'www.cloudfronturl.com/',
                    description: 'this is hosted in s3',
                    pages: [
                        {
                            page: {
                                resource: 'vaccines',
                                description: 'this is about flu vaccines',
                                topics: [
                                    {
                                        topic: {
                                            group: t.namespace,
                                            name: t.name
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        });
        // console.dir(pages);
        var root = {
            'page-domains': pages
        };
        console.log(inspect(root, false, null));
        console.log(pages.length);
        var builder = new xml2js.Builder();
        var xml = builder.buildObject(root);
        console.log(xml);
    })
    .catch(error => {
        console.log(error); // print the error;
    });
