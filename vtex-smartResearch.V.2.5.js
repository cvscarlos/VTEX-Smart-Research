/**
*	Pesquisa Inteligente
*	@description Execurar buscas sem recarregar a página
*	@author Carlos Vinicius
*	@author Edson Domingos Júnior
*	@version 2.5
*	@date 2012-04-10
*/
"function"!==typeof String.prototype.trim&&(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"")});
jQuery.fn.vtexSmartResearch=function(opts)
{
	$this=jQuery(this);
	
    var defaults=
	{
		pageLimit:null, // Número máximo de páginas (limite da paginação)
		loadContent:".prateleira[id^=ResultItems]", // Elemento que esta em volta da(s) prateleira(s) de produtos.
		shelfClass:".prateleira", // Pratelira de produtos (filha de "loadContent")
		filtersMenu:".search-multiple-navigator", // Menu com os filtros
		linksMenu:".search-single-navigator", // Menu de links
		mergeMenu:true, // Definição se o menu será mesclado na página de departamento
		menuDepartament:".navigation .menu-departamento", // seletor do menu da página de departamentos
		insertMenuAfter:".search-multiple-navigator h3:first", // O menu de departamento será inserido após este elemento
		emptySearchElem:jQuery('<div class="vtexsr-emptySearch"></div>'), // Elemento Html da busca vazia
		elemLoading:'<div id="scrollLoading">Carregando ... </div>', // Elemento com mensagem de carregando ao iniciar a requisição da página seguinte
		filterErrorMsg:"Houve um erro ao tentar filtrar a página!", // Mensagem de erro
		emptySearchMsg:'<h3>Esta combinação de filtros não retornou nenhum resultado!</h3>', // Html para quando a busca retornar vazia
		searchUrl:null, // Url da página de busca (opicional)
		usePopup:false, // Opção p/ definir se deseja que a mensagem de não localizado seja exibida em um popup
		showLinks:true, // Exibe o menu de links caso o de filtro não seja encontrado
		popupAutoCloseSeconds:3, // Caso esteja utilizando popup, defina aqui o tempo para que ele feche automaticamente
		callback:function(){},
		// Cálculo do tamanho do footer para que uam nova página seja chamada antes do usuário chegar ao "final" do site
		getShelfHeight:function()
		{
			return (loadContentE.scrollTop()+loadContentE.height());
		},
		// Callback em cada requisição Ajax (Para requisições feitas com sucesso)
		// Recebe como parâmetro um objeto contendo a quantidade total de requisições feitas e a quantidade de filtros selecionados 
		ajaxCallback:function(){},
		// Função que é executada quando a seleção de filtros não retorna nenhum resultado
		// Recebe como parâmetro um objeto contendo a quantidade total de requisições feitas e a quantidade de filtros selecionados 
		emptySearchCallback:function(){},
		// Função para permitir ou não que a rolagem infinita execute na página esta deve retornar "true" ou "false"
		// Recebe como parâmetro um objeto contendo a quantidade total de requisições feitas e a quantidade de filtros selecionados 
		authorizeScroll:function(){return true;},
		// Função para permitir ou não que o conteúdo de "loadContent" seja atualizado. Esta deve retornar "true" ou "false"
		// Recebe como parâmetro um objeto contendo a quantidade total de requisições feitas e a quantidade de filtros selecionados 
		authorizeUpdate:function(){return true;}
	};
    var options=jQuery.extend(defaults, opts),
		_console="object"===typeof(console),
		$empty=jQuery("");

	// Reporting Errors
	if($this.length<1)
	{
		if(_console) console.log("[Aviso] Elemento não encontrado \n ("+$this.selector+")");
		if(options.showLinks) jQuery(options.linksMenu).show();
		return $this;
	}

	var loadContentE=jQuery(options.loadContent),
		filtersMenuE=jQuery(options.filtersMenu);
	// Reporting Errors
	if(loadContentE.length<1){if(_console) console.log("[Erro] Elemento para destino da requisição não foi encontrado \n ("+loadContentE.selector+")"); return false;}
	if(filtersMenuE.length<1 && _console) console.log("[Erro] O menu de filtros não foi encontrado \n ("+filtersMenuE.selector+")");
	
	
	var currentUrl=document.location.href,
		linksMenuE=jQuery(options.linksMenu),
		prodOverlay=jQuery('<div class="vtexSr-overlay"></div>'),
		_document=jQuery(document),
		_window=jQuery(window),
		body=jQuery("body"),
		urlFilters="",
		pageNumber=1,
		currentPage=2,
		searchUrl="",
		currentSearchUrl="",
		shelfJqxhr=null,
		elemLoading=jQuery(options.elemLoading),
		pageJqxhr=null,
		ajaxCallbackObj={requests:0,filters:0, isEmpty:false},
		moreResults=true;
	
	options.emptySearchElem.append(options.emptySearchMsg);
	loadContentE.before(prodOverlay);
	
	var fns=
	{
		exec:function()
		{
			fns.setFilterMenu();
			$this.each(function(){
				var _this=jQuery(this);
				
				fns.adjustText(_this);
				filtersMenuE.css("visibility","visible");
				
				_this.bind("change",function(){
					fns.inputAction();
					if(_this.is(":checked"))
						fns.addFilter(_this);
					else
						fns.removeFilter(_this);
					ajaxCallbackObj.filters=$this.filter(":checked").length;
				});
			});
		},
		mergeMenu:function()
		{
			
			if(!options.mergeMenu) return false;
			
			var elem=body.find(options.menuDepartament);
			elem.insertAfter(options.insertMenuAfter);
			fns.departamentMenuFormat(elem);
		},
		departamentMenuFormat:function(elem)
		{
			elem.find("a").each(function(){
				var a=jQuery(this);
				a.text(fns.removeCounter(a.text()));
			});
		},
		inputAction:function()
		{
			if(null!==pageJqxhr) pageJqxhr.abort();
			if(null!==shelfJqxhr) shelfJqxhr.abort();
			currentPage=2;
			moreResults=true;
		},
		addFilter:function(input)
		{
			urlFilters+="&"+(input.attr("rel")||"");
			prodOverlay.fadeTo(300,0.6);
			currentSearchUrl=fns.getUrl();
			shelfJqxhr=jQuery.ajax({
				url:currentSearchUrl,
				success:fns.filterAjaxSuccess,
				error:fns.filterAjaxError
			});
		},
		removeFilter:function(input)
		{
			var url=(input.attr("rel")||"");
			prodOverlay.fadeTo(300,0.6);
			if(url!=="")
				urlFilters=urlFilters.replace("&"+url,"");
			
			currentSearchUrl=fns.getUrl();
			shelfJqxhr=jQuery.ajax({
				url:currentSearchUrl,
				success:fns.filterAjaxSuccess,
				error:fns.filterAjaxError
			});
		},
		getUrl:function(scroll)
		{
			var s=scroll||false;
			if(s)
				return currentSearchUrl.replace(/PageNumber=[0-9]*/,"PageNumber="+currentPage);
			else
				return (searchUrl+urlFilters).replace(/PageNumber=[0-9]*/,"PageNumber="+pageNumber);
		},
		filterAjaxSuccess:function(data)
		{
			var $data=jQuery(data);
			prodOverlay.fadeTo(300,0,function(){jQuery(this).hide();});
			fns.updateContent($data);
			ajaxCallbackObj.requests++;
			options.ajaxCallback(ajaxCallbackObj);
		},
		filterAjaxError:function()
		{
			prodOverlay.fadeTo(300,0,function(){jQuery(this).hide();});
			alert(options.filterErrorMsg);
			if(_console) console.log("[Erro] Houve um erro ao tentar fazer a requisição da página com filtros.");
		},
		updateContent:function($data)
		{
			if(!options.authorizeUpdate(ajaxCallbackObj)) return false;
			
			var shelf=$data.filter(options.shelfClass);
			var shelfPage=loadContentE.find(options.shelfClass);
			
			(shelfPage.length>0?shelfPage:options.emptySearchElem).slideUp(600,function(){
				jQuery(this).remove();
				
				// Removendo a mensagem de busca vazia, esta remoção "forçada" foi feita para
				// corrigir um bug encontrado ao clicar em vários filtros
				if(options.usePopup)
					body.find(".boxPopUp2").vtexPopUp2();
				else
					options.emptySearchElem.remove();
					
				if(shelf.length>0)
				{
					shelf.hide();
					loadContentE.append(shelf);
					shelf.slideDown(600);
					ajaxCallbackObj.isEmpty=false;
				}
				else
				{	
					ajaxCallbackObj.isEmpty=true;
					
					if(options.usePopup)
						options.emptySearchElem.addClass("freeContent autoClose ac_"+options.popupAutoCloseSeconds).vtexPopUp2().stop(true).show();
					else
					{
						loadContentE.append(options.emptySearchElem);
						options.emptySearchElem.show().css("height","auto").fadeTo(300,0.2,function(){
							options.emptySearchElem.fadeTo(300,1);
						});
					}
					
					options.emptySearchCallback(ajaxCallbackObj);
				}
			});
		},
		adjustText:function(input)
		{
			var label=input.parent(),
				text=label.text();
				qtt="";
			
			text=fns.removeCounter(text);
			
			label.text(text).prepend(input);
		},
		removeCounter:function(text)
		{
			return text.replace(/\([0-9]+\)/ig,function(a){
				qtt=a.replace(/\(|\)/,"");
				return "";
			});
		},
		getSearchUrl:function()
		{
			var url, content, preg;
			jQuery("script:not([src])").each(function(){
				content=jQuery(this)[0].innerHTML;
				preg=/\/buscapagina\?.+&PageNumber=/i;
				if(content.search(/\/buscapagina\?/i)>-1)
				{
					url=preg.exec(content);
					return false;
				}
			});

			if(typeof(url)!=="undefined" && typeof(url[0])!=="undefined")
				return url[0];
			else
			{
				if(_console) console.log("[Erro] Não foi possível localizar a url de busca da página.\n Tente adicionar o .js ao final da página. \n[Método: getSearchUrl]");
				return "";
			}
		},
		scrollToTop:function()
		{
			var elem=body.find("#returnToTop");
			var windowH=_window.height();
			var _html=jQuery("html,body");
			_window.bind("resize",function(){
				windowH=_window.height();
			});
			_window.bind("scroll",function(){
				if(_window.scrollTop()>(windowH))
					elem.stop(true).fadeTo(300,1,function(){elem.show();});
				else
					elem.stop(true).fadeTo(300,0,function(){elem.hide();});
			});
			elem.find("a").bind("click",function(){
				_html.animate({scrollTop:0},"slow");
				return false;
			});
		},
		setFilterMenu:function()
		{
			if(filtersMenuE.length>0)
			{
				linksMenuE.hide();
				filtersMenuE.show();
			}
		},
		infinitScroll:function()
		{
			var elementPages=body.find(".pager:first").attr("id"),
				pages=(null!==options.pageLimit)?options.pageLimit:eval("pagecount_"+elementPages.split("_").pop()),
				currentStatus=true;
			
			// Reportando erros
			if("undefined"===typeof pages) console.log("[Erro] Não foi possível localizar quantidade de páginas.\n Tente adicionar o .js ao final da página. \n[Método: infinitScroll]");
				
			_window.bind('scroll',function(){
				var _this=jQuery(this);
				if(currentPage<=pages && moreResults && options.authorizeScroll(ajaxCallbackObj))
				{
					if((_this.scrollTop()+_this.height())>=(options.getShelfHeight()) && currentStatus)
					{
						var currentItems=loadContentE.find(options.shelfClass).filter(":last");
						currentItems.after(elemLoading);
						currentStatus=false;
						pageJqxhr=jQuery.ajax({
							url: fns.getUrl(true),
							success:function(data)
							{
								if(data.trim().length<1)
								{
									moreResults=false;
									if(_console) console.log("[Aviso] Não existem mais resultados a partir da página: "+(currentPage-1));
								}
								else
									currentItems.after(data);
								currentStatus=true;
								elemLoading.remove();
								ajaxCallbackObj.requests++;
								options.ajaxCallback(ajaxCallbackObj);
							}
						});
						currentPage++;
					}
				}
				else
					return false;
			});
		}
	};

	if(null!==options.searchUrl)
		currentSearchUrl=searchUrl=options.searchUrl;
	else
		currentSearchUrl=searchUrl=fns.getSearchUrl();

	if(body.hasClass("departamento"))
		fns.mergeMenu();

	fns.exec();
	fns.infinitScroll();
	fns.scrollToTop();
	options.callback();
};