angular.module("EmmetBlue")

.controller('pharmacyDispensationController', function($scope, utils, patientEventLogger){
	$scope.patient = {};
	$scope.loadPatientProfile = function(){
		var patient = utils.serverRequest("/patients/patient/search", "POST", {
			"query":$scope.patientNumber,
			"from":0,
			"size":1
		});

		patient.then(function(response){
			var profile = response.hits.hits[0]["_source"];
			$scope.patient.fullName = profile["first name"]+" "+profile["last name"];
			$scope.patient.id = profile["patientid"];
			$scope.patientNumber = "";
		}, function(error){
			utils.errorHandler(error);
		})
	}

	var actions = function (data, type, full, meta){
		var viewButtonAction = "manageDispensation('view', "+data.DispensationID+")";
		
		var dataOpt = "data-option-id='"+data.DispensationID+"' data-option-name='"+data.DispensationName+"' data-option-description='"+data.DispensationDescription+"'";

		var viewButton = "<button class='btn btn-link text-danger billing-type-btn' ng-click=\""+viewButtonAction+"\" "+dataOpt+"><i class='icon-eye'></i> view</button>";
		
		var buttons = "<div class='btn-group'>"+viewButton+"</button>";
		return buttons;
	}
	
	$scope.dtInstance = {};
	$scope.dtOptions = utils.DT.optionsBuilder
	.fromFnPromise(function(){
		var dispensations = utils.serverRequest('/pharmacy/dispensation/view', 'GET');
		return dispensations;
	})
	.withPaginationType('full_numbers')
	.withDisplayLength(10)
	.withFixedHeader()
	.withOption('createdRow', function(row, data, dataIndex){
		utils.compile(angular.element(row).contents())($scope);
	})
	.withOption('headerCallback', function(header) {
        if (!$scope.headerCompiled) {
            $scope.headerCompiled = true;
            utils.compile(angular.element(header).contents())($scope);
        }
    })
	.withButtons([
		{
			text: '<i class="icon-file-plus"></i> <u>N</u>ew Dispensation',
			action: function(){
				$("#new_dispensation").modal("show");
			},
			key: {
        		key: 'n',
        		ctrlKey: false,
        		altKey: true
        	}
		},
        {
        	extend: 'print',
        	text: '<i class="icon-printer"></i> <u>P</u>rint this data page',
        	key: {
        		key: 'p',
        		ctrlKey: false,
        		altKey: true
        	}
        },
        {
        	extend: 'copy',
        	text: '<i class="icon-copy"></i> <u>C</u>opy this data',
        	key: {
        		key: 'c',
        		ctrlKey: false,
        		altKey: true
        	}
        }
	]);	

	$scope.dtColumns = [
		utils.DT.columnBuilder.newColumn('PatientUUID').withTitle("Patient Number"),
		utils.DT.columnBuilder.newColumn('StoreName').withTitle("Dispensing Store"),
		utils.DT.columnBuilder.newColumn('Dispensory').withTitle("Dispensory"),
		utils.DT.columnBuilder.newColumn('DispensationDate').withTitle("Dispensation Date &amp; Time"),
		utils.DT.columnBuilder.newColumn(null).withTitle("Action").renderWith(actions).notSortable()
	];

	$scope.reloadDispensationsTable = function(){
		$scope.dtInstance.reloadData();
	}

	function loadDispensories(){
		var request = utils.serverRequest("/pharmacy/eligible-dispensory/view", "GET");
		request.then(function(result){
			$scope.dispensories = result;
		}, function(error){
			utils.errorHandler(error);
		})
	}

	function loadStores(dispensory){
		var request = utils.serverRequest("/pharmacy/eligible-dispensory/view-by-store?resourceId="+dispensory, "GET");
		request.then(function(result){
			$scope.stores = result;
		}, function(error){
			utils.errorHandler(error);
		})
	}

	$scope.currentDispensory;
	loadDispensories();
	loadStores();

	$scope.$watch(function(){
		return $scope.currentDispensory;
	}, function(newValue){
		loadStores(newValue);
	})

	$scope.$watch(function(){
		return $scope.currentStore;
	}, function(newValue){
		$scope.reloadInventoryTable();
	})


	var inventoryActions = function (data, type, full, meta){
		var buttonAction = "selectItem('select', "+data.ItemID+")";

		var dataOpt = "data-option-id='"+data.ItemID+"' data-option-name='"+data.BillingTypeItemName+"' data-option-code='"+data.Item+"'";

		var button = "<button class='btn btn-default inventory-btn' ng-click=\""+buttonAction+"\" "+dataOpt+">select item </button>";
		
		var buttons = "<div class='btn-group'>"+button+"</button>";
		return buttons;
	}

	$scope.ddtInstance = {};
	$scope.ddtOptions = utils.DT.optionsBuilder
	.fromFnPromise(function(){
		var inventory = utils.serverRequest('/pharmacy/store-inventory/view?resourceId='+$scope.currentStore, 'GET');
		return inventory;
	})
	.withPaginationType('full_numbers')
	.withDisplayLength(10)
	.withFixedHeader()
	.withOption('createdRow', function(row, data, dataIndex){
		utils.compile(angular.element(row).contents())($scope);
	})
	.withOption('headerCallback', function(header) {
        if (!$scope.headerCompiled) {
            $scope.headerCompiled = true;
            utils.compile(angular.element(header).contents())($scope);
        }
    })

	$scope.ddtColumns = [
		utils.DT.columnBuilder.newColumn('Item').withTitle("Item Code").notVisible(),
		utils.DT.columnBuilder.newColumn('BillingTypeItemName').withTitle("Item"),
		utils.DT.columnBuilder.newColumn('ItemBrand').withTitle("Brand"),
		utils.DT.columnBuilder.newColumn('ItemManufacturer').withTitle("Manufacturer"),
		utils.DT.columnBuilder.newColumn('ItemQuantity').withTitle("Quantity in stock"),
		utils.DT.columnBuilder.newColumn(null).withTitle("Action").renderWith(inventoryActions).withOption('width', '25%').notSortable()
	];

	$scope.reloadInventoryTable = function(){
		$scope.ddtInstance.reloadData();
	}

	$scope.currentItem = {

	};

	$scope.dispensationItems = [];

	$scope.itemQuantityBoxValue = 1;

	$scope.selectItem = function(value, id){
		switch(value){
			case "select":{
				$("#item_qty").modal("show");
				var sel = $(".inventory-btn[data-option-id='"+id+"']");
				$scope.currentItem.ItemCode = sel.attr('data-option-code');
				$scope.currentItem.Item = sel.attr('data-option-name');
				$scope.currentItem.item = sel.attr('data-option-code');
				$scope.currentItem.itemID = id;
				break;
			}
		}
	}

	$scope.addItemToList = function(){
		$scope.currentItem.quantity = $scope.itemQuantityBoxValue;
		$scope.itemQuantityBoxValue = 1;
		$("#item_qty").modal("hide");
		$scope.dispensationItems.push($scope.currentItem);
		$scope.currentItem = {};
	}

	$scope.removeItemFromList = function(index){
		$scope.dispensationItems.splice(index, 1);
	}

	var saveDispensation = function(){
		var data = {
			dispensedItems: $scope.dispensationItems,
			eligibleDispensory: $scope.currentDispensory,
			dispensingStore: $scope.currentStore,
			patient: $scope.patient.id,
			dispensee: utils.userSession.getUUID()
		}

		utils.serverRequest('/pharmacy/dispensation/new', 'POST', data).then(function(response){
			var eventLog = patientEventLogger.pharmacy.newDispensationEvent(
				$scope.patient.id,
				response.lastInsertId
			);
			eventLog.then(function(response){
				//patient registered event logged
			}, function(response){
				utils.errorHandler(response);
			});
		}, function(error){
			utils.errorHandler(error);
		})
	}

	var createRequest = function(){
		var reqData = {
			patient: $scope.patient.id,
			requestBy: utils.userSession.getUUID(),
			items: $scope.dispensationItems
		}

		var request = utils.serverRequest("/accounts-biller/payment-request/new", "POST", reqData);

		request.then(function(response){
			utils.notify("Operation successful", "Request generated successfully", "success");
			var eventLog = patientEventLogger.accounts.newPaymentRequestEvent(
				$scope.patient.id,
				'Pharmacy',
				response.lastInsertId
			);
			eventLog.then(function(response){
				//patient registered event logged
			}, function(response){
				utils.errorHandler(response);
			});
			$scope.dispensationItems = [];
			$scope.patient = {};
		}, function(error){
			utils.errorHandler(error);

		})
	}

	$scope.generatePaymentRequest = function(){
		saveDispensation();
		createRequest();
	}
});