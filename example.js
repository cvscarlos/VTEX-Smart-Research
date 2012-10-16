$(function(){
	var disclaimer=$(".disclaimer");
	var halfBanner=$(".halfBanner");

	$(".navLeftDepartament input[type='checkbox']").vtexSmartResearch({
	    loadContent:'.columnMain #search',
	    filtersMenu:'.navLeftDepartament',
	    searchUrl:'/buscapagina?ft=nokia&PS=5&sl=336f9b54-4681-49c2-85b5-c6524e25e92d&cc=1&sm=0&PageNumber=',
		usePopup:true,
		pageLimit:1000,
		ajaxCallback:function(obj)
		{
			if(obj.filters>0)
			{
				disclaimer.hide();
				halfBanner.hide();
			}
			else
			{
				disclaimer.show();
				halfBanner.show();
			}
		},
		authorizeScroll:function(obj)
		{
			return (obj.filters>0)?true:false;
		},
		authorizeUpdate:function(obj)
		{
			if(obj.filters>0)
				return true;
			else
			{
				$("#search").children().slideUp();
				return false;
			}
		}
	});
});