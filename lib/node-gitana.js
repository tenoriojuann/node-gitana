'use strict';

const Gitana = require('gitana');
const path = require('path');
const currentDir = process.cwd();

class NodeGitana {
    
    constructor() {
        this.cache = {
            branch: {}
        };
    }
    
    
    /**
     * Connects to the API server and returns the AppHelper object
     * @param projectName {string}
     * @returns {Promise<{appHelper: Gitana.AppHelper}>}
     */
    connect(projectName) {
        return new Promise((resolve, reject) => {
            const credentials = path.join(currentDir, `/credentials/${projectName}.json`);
            Gitana.connect(credentials, function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve({appHelper: this});
                }
            });
        });
    }
    
    
    /**
     * Retrieves the DataStore, will default to the "content" one if no string is passed
     * @param projectName {string}
     * @param datastore {string}
     * @returns {Promise<{datastore: Gitana.DataStore}>}
     */
    async getDatastore(projectName, datastore = 'content') {
        
        const {appHelper} = await this.connect(projectName);
        
        return new Promise((resolve) => {
            
            appHelper.datastore(datastore).then(function () {
                resolve({datastore: this});
            });
            
        });
        
    }
    
    
    /**
     * Gets all of the active branches
     * @param projectName {string}
     * @returns {Promise<{branchMap: Gitana.BranchMap}>}
     */
    async getActiveBranches(projectName) {
        
        const {datastore} = await this.getDatastore(projectName);
        
        return new Promise((resolve, reject) => {
            
            datastore
                .trap(error => {
                    console.error('Error: Querying branches return in the error:', error);
                    reject(error);
                })
                .queryBranches({
                    $or: [
                        {
                            archived: false,
                            snapshot: false
                        },
                        {
                            archive: {
                                $exists: false
                            },
                            snapshot: false
                        }
                    ]
                }).then(function () {
                
                resolve({branchMap: this});
                
            });
            
        });
        
    }
    
    
    /**
     * Gets the active branch that matches the given branchId
     * @param projectName
     * @param branchId
     * @returns {Promise<{branch: Gitana.Branch}>}
     */
    async getBranch(projectName, branchId) {
        
        
        if (this.cache.branch[`${projectName}-${branchId}`]) {
            return this.cache.branch[`${projectName}-${branchId}`];
        } else {
            
            let found = false;
            const {branchMap} = await this.getActiveBranches(projectName);
            
            return new Promise((resolve, reject) => {
                branchMap.trap(error => {
                    console.error(error);
                    reject(error);
                }).each((branchId, branch) => {
                    
                    const branchName = branch.type.toLowerCase() === 'master' ? 'master' : branchId;
                    this.cache.branch[`${projectName}-${branchId}`] = branch;
                    
                    found = branchName === branchId;
                    
                }).then(function () {
                    if (found) {
                        resolve({branch: this.cache.branch[`${projectName}-${branchId}`]});
                    } else {
                        reject(new Error(`Branch: ${branchId} in project: ${projectName} was not found`));
                    }
                });
            });
        }
    }
    
    
    /**
     *
     * @param projectName {string}
     * @param branchId {string}
     * @param query {{}}
     * @param pagination {{}}
     * @returns {Promise<{nodeMap: Gitana.NodeMap}>}
     */
    async queryNodes(projectName, branchId, query, pagination = {}) {
        
        const {branch} = await this.getBranch(projectName, branchId);
        
        return new Promise((resolve, reject) => {
            
            branch.trap(error => {
                console.error(`Error running the query`);
                reject(error);
            }).queryNodes(query, pagination).then(function () {
                resolve({nodeMap: this});
            });
            
        });
    }
    
    
}


module.exports = new NodeGitana();