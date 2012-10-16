/**
*	Pesquisa Inteligente
*	@description Execurar buscas sem recarregar a página
*	@author Carlos Vinicius
*	@author Edson Domingos Júnior
*	@version 3.5
*	@date 2012-05-17
*/
"function"!==typeof String.prototype.replaceSpecialChars&&(String.prototype.replaceSpecialChars=function(){var b={"\u00e7":"c","\u00e6":"ae","\u0153":"oe","\u00e1":"a","\u00e9":"e","\u00ed":"i","\u00f3":"o","\u00fa":"u","\u00e0":"a","\u00e8":"e","\u00ec":"i","\u00f2":"o","\u00f9":"u","\u00e4":"a","\u00eb":"e","\u00ef":"i","\u00f6":"o","\u00fc":"u","\u00ff":"y","\u00e2":"a","\u00ea":"e","\u00ee":"i","\u00f4":"o","\u00fb":"u","\u00e5":"a","\u00e3":"a","\u00f8":"o","\u00f5":"o",u:"u","\u00c1":"A","\u00c9":"E","\u00cd":"I","\u00d3":"O","\u00da":"U","\u00ca":"E","\u00d4":"O","\u00dc":"U","\u00c3":"A","\u00d5":"O","\u00c0":"A","\u00c7":"C"};return this.replace(/[\u00e0-\u00fa]/g,function(a){return"undefined"!=typeof b[a]?b[a]:a})});
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
		menuDepartament:".navigation .menu-departamento", // seletor do menu da página de departamentos
		insertMenuAfter:".search-multiple-navigator h3:first", // O menu de departamento será inserido após este elemento
		emptySearchElem:jQuery('<div class="vtexsr-emptySearch"></div>'), // Elemento Html (em Objeto jQuery) da busca vazia
		elemLoading:'<div id="scrollLoading">Carregando ... </div>', // Elemento com mensagem de carregando ao iniciar a requisição da página seguinte
		returnTopText:'<span class="text">voltar ao</span><span class="text2">TOPO</span>', // Texto a ser inserido
		emptySearchMsg:'<h3>Esta combinação de filtros não retornou nenhum resultado!</h3>', // Html para quando a busca retornar vazia
		filterErrorMsg:"Houve um erro ao tentar filtrar a página!", // Mensagem de erro
		searchUrl:null, // Url da página de busca (opicional)
		mergeMenu:true, // Definição se o menu será mesclado na página de departamento
		usePopup:false, // Opção p/ definir se deseja que a mensagem de não localizado seja exibida em um popup
		showLinks:true, // Exibe o menu de links caso o de filtro não seja encontrado
		popupAutoCloseSeconds:3, // Caso esteja utilizando popup, defina aqui o tempo para que ele feche automaticamente
		// Função que retorna o valor p/ onde a página deve rolar quando o usuário marca ou desmarca um filtro
		filterScrollTop:function(shelfOffset)
		{
			return (shelfOffset.top-20);
		},
		callback:function(){},
		// Cálculo do tamanho do footer para que uam nova página seja chamada antes do usuário chegar ao "final" do site
		getShelfHeight:function(container)
		{
			return (container.scrollTop()+container.height());
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
		authorizeUpdate:function(){return true;},
		// Callback de cada laço percorrendo os fildsets e os labels. Retorna um objeto com algumas informações
		labelCallback:function(data){}
	};
	
    var options=jQuery.extend(defaults, opts),
		_console="object"===typeof(console),
		$empty=jQuery(""),
		elemLoading=jQuery(options.elemLoading),
		currentPage=2,
		moreResults=true,
		_window=jQuery(window),
		_document=jQuery(document),
		_html=jQuery("html,body"),
		body=jQuery("body"),
		currentSearchUrl="",
		urlFilters="",
		searchUrl="",
		animatingFilter=false,
		loadContentE=jQuery(options.loadContent),
		filtersMenuE=jQuery(options.filtersMenu),
		ajaxCallbackObj={requests:0,filters:0,isEmpty:false},
		labelCallbackData={};

	var fn=
	{
		getUrl:function(scroll)
		{
			var s=scroll||false;
			if(s)
				return currentSearchUrl.replace(/PageNumber=[0-9]*/,"PageNumber="+currentPage);
			else
				return (searchUrl+urlFilters).replace(/PageNumber=[0-9]*/,"PageNumber="+pageNumber);
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
				if(_console) console.log("[Smart Research - Erro] Não foi possível localizar a url de busca da página.\n Tente adicionar o .js ao final da página. \n[Método: getSearchUrl]");
				return "";
			}
		},
		scrollToTop:function()
		{
			var elem=body.find("#returnToTop");
			
			if(elem.length<1)
			{
				elem=jQuery('<div id="returnToTop"><a href="#">'+options.returnTopText+'<span class="arrowToTop"></span></a></div>');
				body.append(elem);
			}
			
			var windowH=_window.height();
			_window.bind("resize",function(){
				windowH=_window.height();
			});
			_window.bind("scroll",function(){
				if(_window.scrollTop()>(windowH))
					elem.stop(true).fadeTo(300,1,function(){elem.show();});
				else
					elem.stop(true).fadeTo(300,0,function(){elem.hide();});
			});
			elem.bind("click",function(){
				_html.animate({scrollTop:0},"slow");
				return false;
			});
		},
		infinitScroll:function()
		{
			var elementPages=body.find(".pager:first").attr("id"),
				pages=(null!==options.pageLimit)?options.pageLimit:eval("pagecount_"+elementPages.split("_").pop()),
				currentStatus=true;
			
			// Reportando erros
			if("undefined"===typeof pages) console.log("[Smart Research - Erro] Não foi possível localizar quantidade de páginas.\n Tente adicionar o .js ao final da página. \n[Método: infinitScroll]");
				
			_window.bind('scroll',function(){
				var _this=jQuery(this);
				if(!animatingFilter && currentPage<=pages && moreResults && options.authorizeScroll(ajaxCallbackObj))
				{
					if((_this.scrollTop()+_this.height())>=(options.getShelfHeight(loadContentE)) && currentStatus)
					{
						var currentItems=loadContentE.find(options.shelfClass).filter(":last");
						currentItems.after(elemLoading);
						currentStatus=false;
						pageJqxhr=jQuery.ajax({
							url: fn.getUrl(true),
							success:function(data)
							{
								if(data.trim().length<1)
								{
									moreResults=false;
									if(_console) console.log("[Smart Research - Aviso] Não existem mais resultados a partir da página: "+(currentPage-1));
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
	}
	
	if(null!==options.searchUrl)
		currentSearchUrl=searchUrl=options.searchUrl;
	else
		currentSearchUrl=searchUrl=fn.getSearchUrl();
	
	// Reporting Errors
	if($this.length<1)
	{
		if(_console) console.log("[Smart Research - Aviso] Nenhuma opção de filtro encontrada");
		if(options.showLinks) jQuery(options.linksMenu).show();
		fn.infinitScroll();
		fn.scrollToTop();
		return $this;
	}

	// Reporting Errors
	if(loadContentE.length<1){if(_console) console.log("[Smart Research - Erro] Elemento para destino da requisição não foi encontrado \n ("+loadContentE.selector+")"); return false;}
	if(filtersMenuE.length<1 && _console) console.log("[Smart Research - Erro] O menu de filtros não foi encontrado \n ("+filtersMenuE.selector+")");

	var currentUrl=document.location.href,
		linksMenuE=jQuery(options.linksMenu),
		prodOverlay=jQuery('<div class="vtexSr-overlay"></div>'),
		departamentE=jQuery(options.menuDepartament),
		loadContentOffset=loadContentE.offset(),
		pageNumber=1,
		shelfJqxhr=null,
		pageJqxhr=null;
	
	options.emptySearchElem.append(options.emptySearchMsg);
	loadContentE.before(prodOverlay);
	
	var fns=
	{
		exec:function()
		{
			fns.setFilterMenu();
			fns.fieldsetFormat();
			$this.each(function(){
				var _this=jQuery(this),
					label=_this.parent();
				
				if(_this.is(":checked"))
				{
					urlFilters+="&"+(_this.attr("rel")||"");
					// Adicionando classe ao label
					label.addClass("sr_selected");
				}
				
				fns.adjustText(_this);
				// Add span vazio (depois de executar de "adjustText")
				label.append('<span class="sr_box"></span><span class="sr_box2"></span>');
				
				_this.bind("change",function(){
					fns.inputAction();
					if(_this.is(":checked"))
						fns.addFilter(_this);
					else
						fns.removeFilter(_this);
					ajaxCallbackObj.filters=$this.filter(":checked").length;
				});
			});
			
			if(""!==urlFilters)
				fns.addFilter($empty);
		},
		mergeMenu:function()
		{
			if(!options.mergeMenu) return false;
			
			var elem=departamentE;
			elem.insertAfter(options.insertMenuAfter);
			fns.departamentMenuFormat(elem);
		},
		mergeMenuList:function()
		{
			var i=0;
			filtersMenuE.find("h3,h4").each(function(){
				var ul=linksMenuE.find("h3,h4").eq(i).next("ul");
				ul.insertAfter(jQuery(this));
				fns.departamentMenuFormat(ul);
				i++;
			});
		},
		departamentMenuFormat:function(elem)
		{
			elem.find("a").each(function(){
				var a=jQuery(this);
				a.text(fns.removeCounter(a.text()));
			});
		},
		fieldsetFormat:function()
		{	
			labelCallbackData.fieldsetCount=0;
			labelCallbackData.tmpCurrentLabel={};
			
			filtersMenuE.find("fieldset").each(function(){
				var $t=jQuery(this),
					label=$t.find("label"),
					fieldsetClass="filtro_"+($t.find("h5:first").text()||"").toLowerCase().replaceSpecialChars().replace(/\s/g,"-");
				
				labelCallbackData[fieldsetClass]={};
				
				// Ocultar fieldset quando não existe filtro e sair desste método
				if(label.length<1)
				{
					$t.hide();
					return;
				}
				
				// Adicionar classe ao fieldset
				$t.addClass(fieldsetClass);
				
				// Adicionando classe e título ao label
				label.each(function(ndx){
					var t=jQuery(this),
						v=(t.find("input").val()||""),
						labelClass="sr_"+v.toLowerCase().replaceSpecialChars().replace(/\s/g,"-");
						
					labelCallbackData.tmpCurrentLabel=
					{
						fieldsetParent:[$t,fieldsetClass],
						elem:t
					};
						
					labelCallbackData[fieldsetClass][ndx.toString()]=
					{
						className:labelClass,
						title:v
					};
						
					t.addClass(labelClass).attr({"title":v,"index":ndx});
					
					options.labelCallback(labelCallbackData);
				});
				
				labelCallbackData.fieldsetCount++;
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
			currentSearchUrl=fn.getUrl();
			shelfJqxhr=jQuery.ajax({
				url:currentSearchUrl,
				success:fns.filterAjaxSuccess,
				error:fns.filterAjaxError
			});
			// Adicionando classe ao label
			input.parent().addClass("sr_selected");
		},
		removeFilter:function(input)
		{
			var url=(input.attr("rel")||"");
			prodOverlay.fadeTo(300,0.6);
			if(url!=="")
				urlFilters=urlFilters.replace("&"+url,"");
			
			currentSearchUrl=fn.getUrl();
			shelfJqxhr=jQuery.ajax({
				url:currentSearchUrl,
				success:fns.filterAjaxSuccess,
				error:fns.filterAjaxError
			});
			// Removendo classe do label
			input.parent().removeClass("sr_selected");
		},
		filterAjaxSuccess:function(data)
		{
			var $data=jQuery(data);
			prodOverlay.fadeTo(300,0,function(){jQuery(this).hide();});
			fns.updateContent($data);
			ajaxCallbackObj.requests++;
			options.ajaxCallback(ajaxCallbackObj);
			_html.animate({scrollTop:options.filterScrollTop((loadContentOffset||{top:0,left:0}))},600);
		},
		filterAjaxError:function()
		{
			prodOverlay.fadeTo(300,0,function(){jQuery(this).hide();});
			alert(options.filterErrorMsg);
			if(_console) console.log("[Smart Research - Erro] Houve um erro ao tentar fazer a requisição da página com filtros.");
		},
		updateContent:function($data)
		{
			animatingFilter=true;
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
					shelf.slideDown(600,function(){animatingFilter=false;});
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
		setFilterMenu:function()
		{
			if(filtersMenuE.length>0)
			{
				linksMenuE.hide();
				filtersMenuE.show();
			}
		}
	};

	if(body.hasClass("departamento"))
		fns.mergeMenu();
	else if(body.hasClass("categoria") || body.hasClass("resultado-busca"))
		fns.mergeMenuList();
	
	fns.exec();
	fn.infinitScroll();
	fn.scrollToTop();
	options.callback();
	
	// Exibindo o menu
	filtersMenuE.css("visibility","visible");
};