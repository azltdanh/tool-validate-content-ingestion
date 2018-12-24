# tool-validate-content-ingestion
Scan question bank package for invalid question and missing data images

# Setup
```
$ npm install --save-dev lodash fs xml2js eyes
```

# Run in Terminal
```
$ node validate-imsmanifest.js {path-to-package-dir}
```

Add --fix to auto fix encoded-tag and force-close-tag

# Example
```
$ node validate-imsmanifest.js ~/Downloads/MEDED_UKBasicScience_v24_1111222222222_MedEd
$ node validate-imsmanifest.js ~/Downloads/MEDED_UKClinicalMedicine_v42_1111333333333_MedEd
```
