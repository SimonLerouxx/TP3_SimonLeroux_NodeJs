import fs from "fs";
import { v1 as uuidv1 } from "uuid";
import * as utilities from "../utilities.js";
import { log } from "../log.js";
import RepositoryCachesManager from "./repositoryCachesManager.js";
import CollectionFilter from "./collectionFilter.js";

globalThis.jsonFilesPath = "jsonFiles";
globalThis.repositoryEtags = {};


export default class Repository {
    constructor(ModelClass, cached = true) {
        this.objectsList = null;
        this.model = ModelClass;
        this.objectsName = ModelClass.getClassName() + "s";
        this.objectsFile = `./jsonFiles/${this.objectsName}.json`;
        this.initEtag();
        this.cached = cached;
    }
    initEtag() {
        if (this.objectsName in repositoryEtags)
            this.ETag = repositoryEtags[this.objectsName];
        else this.newETag();
    }
    newETag() {
        this.ETag = uuidv1();
        repositoryEtags[this.objectsName] = this.ETag;
    }
    objects() {
        if (this.objectsList == null) this.read();
        return this.objectsList;
    }
    read() {
        this.objectsList = null;
        if (this.cached) {
            this.objectsList = RepositoryCachesManager.find(this.objectsName);
        }
        if (this.objectsList == null) {
            try {
                let rawdata = fs.readFileSync(this.objectsFile);
                // we assume here that the json data is formatted correctly
                this.objectsList = JSON.parse(rawdata);
                if (this.cached)
                    RepositoryCachesManager.add(this.objectsName, this.objectsList);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // file does not exist, it will be created on demand
                    log(FgYellow, `Warning ${this.objectsName} repository does not exist. It will be created on demand`);
                    this.objectsList = [];
                } else {
                    log(FgRed, `Error while reading ${this.objectsName} repository`);
                    log(FgRed, '--------------------------------------------------');
                    log(FgRed, error);
                }
            }
        }
    }
    write() {
        this.newETag();
        fs.writeFileSync(this.objectsFile, JSON.stringify(this.objectsList));
        if (this.cached) {
            RepositoryCachesManager.add(this.objectsName, this.objectsList);
        }
    }
    nextId() {
        let maxId = 0;
        for (let object of this.objects()) {
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }
    checkConflict(instance) {
        let conflict = false;
        if (this.model.key)
            conflict = this.findByField(this.model.key, instance[this.model.key], instance.Id) != null;
        if (conflict) {
            this.model.addError(`Unicity conflict on [${this.model.key}]...`);
            this.model.state.inConflict = true;
        }
        return conflict;
    }
    add(object) {
        delete object.Id;
        object = { "Id": 0, ...object };
        this.model.validate(object);
        if (this.model.state.isValid) {
            this.checkConflict(object);
            if (!this.model.state.inConflict) {
                object.Id = this.nextId();
                this.model.handleAssets(object);
                this.objectsList.push(object);
                this.write();
            }
        }
        return object;
    }
    update(id, objectToModify) {
        delete objectToModify.Id;
        objectToModify = { Id: id, ...objectToModify };
        this.model.validate(objectToModify);
        if (this.model.state.isValid) {
            let index = this.indexOf(objectToModify.Id);
            if (index > -1) {
                this.checkConflict(objectToModify);
                if (!this.model.state.inConflict) {
                    this.model.handleAssets(objectToModify, this.objectsList[index]);
                    this.objectsList[index] = objectToModify;
                    this.write();
                }
            } else {
                this.model.addError(`The ressource [${objectToModify.Id}] does not exist.`);
                this.model.state.notFound = true;
            }
        }
        return objectToModify;
    }
    remove(id) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === id) {
                this.model.removeAssets(object)
                this.objectsList.splice(index, 1);
                this.write();
                return true;
            }
            index++;
        }
        return false;
    }
    getAll(HttpContext) {
        let objectsList = this.objects();
        let bindedDatas = [];

        let containsFilter = false;


        for (let i = 0; i < Object.keys(HttpContext.path.params).length; i++) {
            if (Object.keys(HttpContext.path.params)[i] != "limit" && Object.keys(HttpContext.path.params)[i] != "offset" &&
                Object.keys(HttpContext.path.params)[i] != "fields" && Object.keys(HttpContext.path.params)[i] != "sort") 
            {
                containsFilter = true;
            }
        }



        //reste optimisation et enlever doublons
        if (objectsList) {
            for (let data of objectsList) {

                if (containsFilter) {
                    for (let i = 0; i < Object.keys(HttpContext.path.params).length; i++) {
                        if (Object.keys(HttpContext.path.params)[i] != "limit" && Object.keys(HttpContext.path.params)[i] != "offset" &&
                            Object.keys(HttpContext.path.params)[i] != "fields" && Object.keys(HttpContext.path.params)[i] != "sort") 
                        {

                            if(HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].includes('*')){
                                if(HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].startsWith("*") && HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].endsWith("*")){
                                    let value = HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].replaceAll("*", "");
                                    if (data[Object.keys(HttpContext.path.params)[i]].includes(value)) {
                                        bindedDatas.push(this.model.bindExtraData(data));
                                    }
                                }
                                else if(HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].startsWith("*")){
                                    let value = HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].replace("*", "");
                                    if (data[Object.keys(HttpContext.path.params)[i]].startsWith(value)) {
                                        bindedDatas.push(this.model.bindExtraData(data));
                                    }
                                }
                                else if(HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].endsWith("*")){
                                    let value = HttpContext.path.params[Object.keys(HttpContext.path.params)[i]].replace("*", "");
                                    if (data[Object.keys(HttpContext.path.params)[i]].endsWith(value)) {
                                        bindedDatas.push(this.model.bindExtraData(data));
                                    }
                                }
                            }
                            else{
                                if (data[Object.keys(HttpContext.path.params)[i]] == HttpContext.path.params[Object.keys(HttpContext.path.params)[i]]) {
                                    bindedDatas.push(this.model.bindExtraData(data));
                                }
                            }
                            
                            
                        }

                    }
                }
                else{
                    bindedDatas.push(this.model.bindExtraData(data));
                }


            };
        }

        //Remove duplicates
        const seen = new Set();
        let tabOfAllFields = Object.keys(bindedDatas[0]);

         bindedDatas = bindedDatas.filter(element => {
          let info ="";
          for(let i=0;i<tabOfAllFields.length;i++){
            info =info+element[tabOfAllFields[i]];
          }
          const duplicate = seen.has(info);
          seen.add(info);
          return !duplicate;
        });



        bindedDatas = CollectionFilter.Filter(bindedDatas, HttpContext);
        return bindedDatas;
    }

    get(id) {
        for (let object of this.objects()) {
            if (object.Id === id) {
                return this.model.bindExtraData(object);
            }
        }
        return null;
    }

    filterInt = function (value) {
        if (/^(-|\+)?(\d+|Infinity)$/.test(value)) return Number(value);
        return NaN;
      };

    removeByIndex(indexToDelete) {
        if (indexToDelete.length > 0) {
            utilities.deleteByIndex(this.objects(), indexToDelete);
            this.write();
        }
    }
    findByField(fieldName, value, excludedId = 0) {
        if (fieldName) {
            let index = 0;
            for (let object of this.objects()) {
                try {
                    if (object[fieldName] === value) {
                        if (object.Id != excludedId) return this.objectsList[index];
                    }
                    index++;
                } catch (error) { break; }
            }
        }
        return null;
    }
    indexOf(id) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === id) return index;
            index++;
        }
        return -1;
    }
}
