
export default class CollectionFilter {

    constructor(){
    }


    static Filter(bindedDatas,httpContext){
        //console.log(bindedDatas[0])
        let modifiedDatas = bindedDatas;
        //console.log(httpContext.path.params)
        modifiedDatas.sort((a, b) => a.Id > b.Id ? 1 : -1);


        modifiedDatas = this.FilterByName(modifiedDatas,httpContext);
        modifiedDatas = this.Fields(modifiedDatas,httpContext);
        modifiedDatas = this.Sort(modifiedDatas,httpContext);
        modifiedDatas = this.Limit(modifiedDatas,httpContext);
       


       return modifiedDatas;
    }


    static FilterByName(bindedDatas,httpContext){

      console.log(httpContext.path.params);
      var dataToReturn=[];

      //for(let i=0;i<Object.keys(httpContext.path.params).length;i++){
       // if(Object.keys(httpContext.path.params)[i] != "limit" ||Object.keys(httpContext.path.params)[i] != "offset" ||
       // Object.keys(httpContext.path.params)[i] != "fields" || Object.keys(httpContext.path.params)[i] != "sort")
      //  {

      //  }
      //}

      console.log(Object.keys(httpContext.path.params)[0]);

      //httpContext.path.params.forEach(element => {
      //  console.log(element);
      //});
      return bindedDatas;
    }


    static Limit(bindedDatas,httpContext){
      if(httpContext.path.params != undefined){
        if(httpContext.path.params["limit"] != undefined && httpContext.path.params["offset"] != undefined){

          let limit =httpContext.path.params["limit"];
          let offset =httpContext.path.params["offset"];
          let startIndex = limit*offset;

          var dataToReturn=[];

          for(let i=startIndex;i<parseInt(startIndex)+parseInt(limit);i++){
            dataToReturn.push(bindedDatas[i]);
          }

          return dataToReturn;
        }
      }
      return bindedDatas;
    }



    static Fields(bindedDatas,httpContext){
      if(httpContext.path.params != undefined){
        if(httpContext.path.params["fields"] != undefined){

            let tabOfFields = httpContext.path.params["fields"].split(',');
            let tabOfAllFields = Object.keys(bindedDatas[0]);
            let difference =  tabOfAllFields.filter((element) => !tabOfFields.includes(element)); 

            for(let i=0;i<bindedDatas.length;i++){
                for(let y=0;y<difference.length;y++){
                    delete bindedDatas[i][difference[y]];
                }  
            }


            
            // Doit enlever les doublons

           
        }
      }
        return bindedDatas
    }

  static Sort(modifiedDatas, httpContext) {
      if(httpContext.path.params != undefined){

      
        if(httpContext.path.params["sort"] != undefined){
            let valueSort =httpContext.path.params["sort"];
            if(valueSort.includes(",desc"))
            {
                valueSort = valueSort.replace(',desc','');
                modifiedDatas.sort((nameA, nameB) => {
                    if (nameA[valueSort] < nameB[valueSort]) {
                      return 1;
                    }
                    if (nameA[valueSort] > nameB[valueSort]) {
                      return -1;
                    }
    
                    return 0;
                  });
            }
            else{
                modifiedDatas.sort((nameA, nameB) => {
                    if (nameA[valueSort] > nameB[valueSort]) {
                      return 1;
                    }
                    if (nameA[valueSort] < nameB[valueSort]) {
                      return -1;
                    }
    
                    return 0;
                  });
            }
            

          }
       }
       return modifiedDatas
    }


}