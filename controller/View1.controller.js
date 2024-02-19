sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
	"use strict";

	return Controller.extend("salesreportZUSD_REPORT.controller.View1", {
		sortby: true,

		filterKeys: ['RimSize', 'Category', 'MFG', 'Type', 'Line', 'WhlWidth', 'BoltPattern1', 'BoltPattern2', 'TypeCode', 'TypeDesc', 'Width', 'AspectRatio'],

		onInit: function () {
			this.byId("curDate").setDateValue(new Date());
			this.byId("curDate").setMaxDate(new Date());
		},
		onSortByCode: function (e) {
			this.getData(true);
			this.sortby = !this.sortby;
			var label = this.sortby ? "Sort by PRODUCT-CODE ↑" : "Sort by PRODUCT-CODE ↓";
			e.getSource().setText(label);
		},

		// clearTable: function() {
		// 	var table 	= this.getView().byId("SF1_TABLE");

		// 	var oModel = new sap.ui.model.json.JSONModel();
		// 	oModel.setData([]);
			
		// 	table.setModel(oModel, "oLocalFinalsalesModel");
		// },

		// get data by year, month
		onSearch: function () {
			this.getData();
		},

		// get data by year, month
		onClear: function () {
			var $this = this;
			$this.filterKeys.forEach(function(key) {
				$this.byId(key).setValue('');
			});

			this.getData();
		},

		getCode: function (oContext) {
			return oContext.getProperty('ProductCode');
		},

		// get data between date range, and then sort the data by product code
		getData: function (sortby) {
			var $this 				= this;
			var oLocalModel 		= this.getView().getModel("localModel");
			var oLocalData 			= oLocalModel.getData().results;
			var tempData 			= {};
			var filterValues 		= {};
			var selectedDate 		= this.byId('curDate').getDateValue();
			var dateRange 			= this.setTableHeaderByMonth(selectedDate);

			var notEmptyNum 		= 0;
			$this.filterKeys.forEach(function(key) {
				var value 			= $this.byId(key).getValue();
				filterValues[key] 	= $.trim(value);
				if (value != '') notEmptyNum++;
			});

			// filter by conditions
			for (var i = 0; i < oLocalData.length; i++) {
				var item = oLocalData[i];

				if (dateRange.indexOf(item.Date_YearMonth) > -1) {
					var num = 0;
					for (var key in filterValues) {
						if (filterValues[key] != '' && item[key].indexOf(filterValues[key]) > -1) { 		// item[key] == filterValues[key]
							num++;
					   	}
					}
					if (num != notEmptyNum && notEmptyNum != 0) continue;

					var uniCode = item['TypeCode'] + '-' + item['TypeDesc'] + '_' + item['ProductSize'];
					tempData[uniCode] == undefined ? tempData[uniCode] = {} : '';
					tempData[uniCode][item['Articlecode']] == undefined ? tempData[uniCode][item['Articlecode']] = [] : '';
					tempData[uniCode][item['Articlecode']].push(item);
				}
			}

			var finalData = [];
			for (var uniCode in tempData) {
				var articleCodeArr 		= tempData[uniCode];
				var productCode_Size 	= uniCode.split('_');
				for (var articleCode in articleCodeArr) {
					var productMonthItem = {
						ProductCode: productCode_Size[0],
						ArticleCode: articleCode,
						ProductSize: productCode_Size[1],
						CodeName: articleCode
					};
					articleCodeArr[articleCode].forEach(function (item) {
						var monthIndex = dateRange.indexOf(item['Date_YearMonth']);
						productMonthItem[monthIndex] = item['monthSumamount'];
					});
					finalData.push(productMonthItem);
				}
			}

			if (sortby) {
				if (this.sortby) {
					finalData = finalData.sort((r1, r2) => (r1.ProductCode > r2.ProductCode) ? 1 : (r1.ProductCode < r2.ProductCode) ? -1 : 0);
				} else {
					finalData = finalData.sort((r1, r2) => (r1.ProductCode > r2.ProductCode) ? -1 : (r1.ProductCode < r2.ProductCode) ? 1 : 0);
				}
			}

			var totalRow 			= {};	// temp
			var grand_total 		= 0;	// YID grand total
			var grand_total_month 	= {};	// grand total by month
			var result_sales_data 	= [];  	// final sales data

			dateRange.forEach(function (monthStr, monthIndex) {
				totalRow[monthIndex] 			= 0;
				grand_total_month[monthIndex] 	= 0;
			});

			for (var i = 0; i < finalData.length; i++) {
				var saleItem = finalData[i];
				dateRange.forEach(function (monthStr, monthIndex) {
					saleItem[monthIndex] = saleItem[monthIndex] == undefined ? 0 : Number(saleItem[monthIndex]);
					saleItem[monthIndex] = saleItem[monthIndex] == 0 ? '' : saleItem[monthIndex];
				});
				result_sales_data.push(saleItem);

				dateRange.forEach(function (monthStr, monthIndex) {
					totalRow[monthIndex] += Number(finalData[i][monthIndex]);
				});

				// add sub total row
				if (finalData.length == (i + 1)) {
					var row = {}, total = 0;
					row['ArticleCode'] 		= finalData[i].Articlecode;
					row['CodeName'] 		= 'sub total';
					row['ProductCode'] 		= finalData[i].ProductCode;
					dateRange.forEach(function (monthStr, monthIndex) {
						row[monthIndex] = totalRow[monthIndex] == 0 ? '' : totalRow[monthIndex];
						grand_total_month[monthIndex] += Number(totalRow[monthIndex]);
						total += Number(totalRow[monthIndex]);
					});
					grand_total += total;
					row['year'] = total;
					result_sales_data.push(row);
				} else {
					var curProductCode = finalData[i].ProductCode;
					var nextProductCode = finalData[i + 1].ProductCode;
					if (curProductCode != nextProductCode) {
						var row = {}, total = 0;
						row['ArticleCode'] 		= finalData[i].Articlecode;
						row['CodeName'] 		= 'sub total';
						row['ProductCode'] 		= curProductCode;
						dateRange.forEach(function (monthStr, monthIndex) {
							row[monthIndex] = totalRow[monthIndex] == 0 ? '' : totalRow[monthIndex];
							grand_total_month[monthIndex] += Number(row[monthIndex]);
							total += Number(row[monthIndex]);
						});
						grand_total += total;
						row['year'] = total;
						result_sales_data.push(row);

						dateRange.forEach(function (monthStr, monthIndex) {
							totalRow[monthIndex] = 0;
						});
					}
				}
			}

			// add grand total row
			var row 				= {};
			row['ArticleCode'] 		= 'grand';
			row['CodeName'] 		= 'grand total';
			row['ProductCode'] 		= '';
			row['year'] = grand_total;
			dateRange.forEach(function (monthStr, monthIndex) {
				row[monthIndex] = grand_total_month[monthIndex];
			});

			var oLocalFinalsalesModel = new sap.ui.model.json.JSONModel();
			oLocalFinalsalesModel.setData(result_sales_data);
			this.getView().byId("SF1_TABLE").setModel(oLocalFinalsalesModel, "oLocalFinalsalesModel");

			// dataModel for grand total
			var oLocalGrandModel = new JSONModel([row]);
			this.getView().setModel(oLocalGrandModel, "oLocalGrandModel");
		},

		// set dynamic header of table, and return array of ids
		setTableHeaderByMonth: function (sDate) {
			var theMonths 	= new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
			var now 		= new Date(sDate + 1);
			var lvMonthYear = [];

			var no = 1;
			for (var i = 0; i > -12; i--) {
				var future 	= new Date(now.getFullYear(), now.getMonth() + i, 1);
				var month 	= theMonths[future.getMonth()];
				var year 	= future.getFullYear();
				lvMonthYear.push(String(year) + String(this.pad(future.getMonth() + 1, 2)));

				this.byId("SF2_Head_Month_" + no).setText(month + '-' + String(year).slice(2));
				no++;
			}
			return lvMonthYear;
		},

		// add zero into number
		pad: function (num, size) {
			num = num.toString();
			while (num.length < size) num = "0" + num;
			return num;
		}
	});
});