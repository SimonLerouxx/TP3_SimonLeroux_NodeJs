
export default class CollectionFilter {

    constructor(){
    }


    static Filter(bindedDatas,httpContext){
        //console.log(bindedDatas[0])
        let modifiedDatas = bindedDatas;
        console.log(httpContext.path.params)

        modifiedDatas = this.Sort(bindedDatas,httpContext);
        modifiedDatas = this.Fields(modifiedDatas,httpContext);
       
       return modifiedDatas;
    }

    static Fields(bindedDatas,httpContext){
        if(httpContext.path.params["fields"] != undefined){

            let tabOfFields = httpContext.path.params["fields"].split(',');
            let tabOfAllFields = Object.keys(bindedDatas[0]);
            let difference =  tabOfAllFields.filter((element) => !tabOfFields.includes(element)); 

            for(let i=0;i<bindedDatas.length;i++){

                for(let y=0;y<difference.length;y++){
                    delete bindedDatas[i][difference[y]];
                }  
            }
        }
        return bindedDatas
    }

    static Sort(modifiedDatas,httpContext){
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
       return modifiedDatas
    }


}