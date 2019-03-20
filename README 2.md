# els-tool-validate-content-ingestion

## Requirements:

  1. NodeJS v8.12.0 and npm v6.4.1
  2. An IDE (Webstorm, Eclipse, IntelliJ IDEA, Visual Studio Code, etc)
  3. Access to the Artifactory (<https://artifactory.hm.tio.elsevier.systems>)


## Getting Started
### NPM Setting
This project uses the two following registries to install dependencies:
* http://registry.npmjs.org: install react, babel, etc // npm default registry
* https://artifactory.hm.tio.elsevier.systems:  install @els libraries.

#### Setup credentials for registry  https://elsols.artifactoryonline.com

* Open Console:
```
npm config set @els:registry https://artifactory.hm.tio.elsevier.systems/artifactory/api/npm/npm/
npm login --registry=https://artifactory.hm.tio.elsevier.systems/artifactory/api/npm/npm/ --scope=@els --always-auth=true
```

* Go to <https://artifactory.hm.tio.elsevier.systems/artifactory/webapp/#/profile> to get your API KEY as Password to Login

### Development Environment

There are 3 ways to run development environment:

#### 1. Link with the consuming app during the development (recommended)
* In the module:
```
  npm link //need to run one time only
  npm start // build the component with watch mode
```

* In the app:
```
  npm link @els/els-tool-validate-content-ingestion // note: the link is removed whenever you run npm install
  npm start // run the app
```
Whenever you change the code of the component, react-hot-loader will automatically update the change to the app. This mode is recommended because you always know how the app actually consumes the component.

#### 2. Run with demoApp in the Validate Content Ingestion module:
```
  npm run dev
```
You only use this mode when you do not know how the app actually consumes the component.

#### 2. Run with styleguidist:
```
  npm run document
```

This tool collects all components definition (\*.md) and show it visually in a web page. You can edit the callers in the real time.
The purpose of this tool mainly for documentation so it is not recommended for development purpose because sometime the bugs are from the tool it self but not from your code.

### Production Environment
```
  npm run build
```


### Notes

- [Coding Best Practice](https://elsevier-healthsolutions.atlassian.net/wiki/spaces/CKMedED/pages/184582767/Coding+Best+Practices)

