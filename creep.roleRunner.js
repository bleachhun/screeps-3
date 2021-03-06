"use strict";

const setupTask = require('utils').setupTask;
const calcTasks = require("calcTasks");

module.exports = {

    getGettingTask : function(creep){
        //here the prioritization of one source is missing
		var room = creep.room
		var creepsByTask = _(Game.creeps).filter( (c) => c.task && c.task.roomName == room.name).groupBy('task.type').value();
        var getEnergyTasks = calcTasks.calcGetEnergyTasks(room,creepsByTask);
        var myIndex = -1;
        myIndex = _.findIndex(getEnergyTasks, (t) => t.amountAvailable == Game.getObjectById(t.id).storeCapacity);
        if(myIndex != -1){
            creep.task=getEnergyTasks[myIndex];
            return OK;
        }
        var pickupTasks = calcTasks.calcPickupTasks(room,creepsByTask);
        myIndex = _.findIndex(pickupTasks,(t) => t.amountLeft > 50); //here a better check than > 50 would be nice
        if(myIndex != -1){
            creep.task=pickupTasks[myIndex];
            return OK;
        }
        //this should now prioritize runners in an energy shortage (observe if this isn't too much)
        myIndex = _.findIndex(getEnergyTasks,(t) => t.amountAvailable >= ( (_.get(creep.room,"storage.store.energy",0) < 10*creep.carryCapacity)? 1 : (creep.carryCapacity - creep.carry.energy) ) );
        if(myIndex != -1){
            creep.task=getEnergyTasks[myIndex];
            return OK;
        }
		if(!creep.room.storage && creep.role == ROLE_RUNNER){
			myIndex = _.findIndex(getEnergyTasks,(t) => t.amountAvailable > 0);
	        if(myIndex != -1){
	            creep.task=getEnergyTasks[myIndex];
            	return OK;
			}
		}
        //this should work now that we do creep-based tasks, but should reset when empty
        if(creep.room.storage && creep.room.storage.store.energy >= (creep.carryCapacity - creep.carry.energy)){
            creep.task= setupTask(TASK_GET_ENERGY,creep.room.storage);
        }
    },

    getDeliveringTask : function(creep){
        //prioritizing logic is needed here, so towers are prioritized appropriately in an emergency
        var deliverList = creep.room.memory.tasks[TASK_FILL];
        deliverList = _.sortBy(deliverList, (x) => creep.pos.getRangeTo(x)); //so they deliver to closest first
		var myIndex = _.findIndex(deliverList, (x) => x.structureType == STRUCTURE_TOWER && x.amountNeeded >= 400);
		if(myIndex != -1){
			deliverList[myIndex].amountNeeded -= creep.carry.energy;
            creep.task=deliverList[myIndex];
            creep.room.memory.tasks[TASK_FILL] = deliverList
            return OK;
		}
        myIndex = _.findIndex(deliverList, (x) => x.structureType == STRUCTURE_CONTAINER && x.amountNeeded >= 1000);
        if(myIndex != -1){ //maybe this prioritization is too much, but we'll see
            deliverList[myIndex].amountNeeded -= creep.carry.energy;
            creep.task=deliverList[myIndex];
            creep.room.memory.tasks[TASK_FILL] = deliverList
            return OK;
        }
        myIndex = _.findIndex(deliverList, (t) => t.amountNeeded > 0);
        if(myIndex != -1){
			deliverList[myIndex].amountNeeded -= creep.carry.energy;
			creep.task=deliverList[myIndex];
			creep.room.memory.tasks[TASK_FILL] = deliverList;
            return OK;
        }
		else if(creep.room.storage) {
			creep.task=setupTask(TASK_FILL,creep.room.storage);
			return OK;
		}
    },

	run : function(creep){
		if(creep.memory.delivering && creep.carry.energy == 0) {
            creep.memory.delivering = false;
			creep.task = undefined;
            creep.say('getting');
	    }
	    if(!creep.memory.delivering && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.delivering = true;
            creep.task = undefined;
	        creep.say('delivering');
		}

        if(!creep.task){
            if(creep.memory.delivering){
                this.getDeliveringTask(creep);
            }
            else{
                if(creep.ticksToLive < 50){
                    creep.role = ROLE_RECYCLER;
                }
                else{
                    this.getGettingTask(creep);
                }
            }
        }
	}
}
