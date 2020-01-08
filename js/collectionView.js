//=============================================================
// TODO: next(), previous(), etc. need to skip hidden elements
//=============================================================

(function($) {
	'use strict';
	
	$.Event.prototype.origin = function() {
		return CV.point(this.pageX, this.pageY);
	};
	
	$.fn.extend({
		'origin': function() {
			var offset = this.offset();
			return CV.point(offset.left, offset.top);
	  	},
	  	'size': function() {
	  		return CV.size(this.width(), this.height());
	  	},
	  	'frame': function() {
	  		var origin = this.origin();
	  		var size = this.size();
	  		return CV.frame(origin, size);
	  	},
	  	'bounds': function() {
	  		var origin = ViewPoint(0, 0);
	  		var size = this.size();
	  		return CV.frame(origin, size);
	  	}
	});
	
	window.CV = {
		'touchTarget': null,
		'touchScreenX': null,
    		'touchScreenY': null,
    		'conditionParentUntilTrue': function (element, condition) {
    			var self = this;
    			var outcome;
			
    			if(element === document.body) {
        			return false;
    			}

   			outcome = condition(element);

    			if(outcome) {
        			return true;
    			} 
    			else {
        			return self.conditionParentUntilTrue(element.parentNode, condition);
    			}
		},
    		'disableScroll': null,
	    	'scrollMap': null,
		'EventKeys': {
			'UP_ARROW': 38,
			'LEFT_ARROW': 37,
			'DOWN_ARROW': 40,
			'RIGHT_ARROW': 39,
			'W': 87,
			'A': 65,
			'S': 83,
			'D': 68
		},
		'Optional': function(value, defaultValue) {
			if(value === null || value === undefined) {
				return defaultValue;
			}
		    return value;
		},
		'round': function(number, precision) {
			var factor = Math.pow(10, precision);
			var tempNumber = number * factor;
			var roundedTempNumber = Math.round(tempNumber);
	
			return roundedTempNumber / factor;
		},
		'range': function(value, minMaxValue, rounded) {
			var result = Math.min(Math.max(value, -minMaxValue), minMaxValue);
			
			if(rounded) {
				return CV.round(result, 3);
			}
			else {
				return result;
			}
		},
		'point': function(x, y) {
			return {'x': x, 
					'y': y,
					'multiplyScalar': function(scalar) {
						var self = this;
						return CV.point(self.x * scalar, self.y * scalar);
					},
					'multiplyScalars': function(scalarX, scalarY) {
						var self = this;
						return CV.point(self.x * scalarX, self.y * scalarY);
					},
					'multiply': function(point) {
						var self = this;
						return CV.point(self.x * point.x, self.y * point.y);
					},
					'negate': function() {
						var self = this;
						return CV.point(-self.x, -self.y);
					},
					'addSize': function(size) {
						var self = this;
						return CV.point(self.x + size.width, self.y + size.height);
					},
					'subtractSize': function(size) {
						var self = this;
						return CV.point(self.x - size.width, self.y - size.height);
					},
					'range': function(point, rounded) {
						var self = this;
						var x = CV.range(self.x, point.x, rounded);
						var y = CV.range(self.y, point.y, rounded);
						return CV.point(x, y);
					},
					'flip': function() {
						var self = this;
						return CV.point(y, x);
					}};
		},
		'size': function(width, height) {
			return {'width': width, 
					'height': height,
					'multiplyScalar': function(scalar) {
						var self = this;
						return CV.size(self.width * scalar, self.height * scalar);
					}};
		},
		'frame': function(origin, size) {
			return {'origin': origin, 
					'size': size,
					'contains': function(point) {
						var self = this;
						if(point.x >= self.origin.x || point.x < (self.origin.x + self.size.width) || point.y >= self.origin.y || point.y < (self.origin.y + self.size.height)) {
							return true;
						}
						return false;
					},
					'convert': function(point) {
						var self = this;
						return CV.point(point.x - self.origin.x, point.y - self.origin.y);
					},
					'normalize': function(point) {
						var self = this;
						// create a range between (-1, 1) for x and y
						var x = (0.5 - point.x / self.size.width) * 2;
						var y = (0.5 - point.y / self.size.height) * 2;
						return CV.point(x, y);
					}};
		},
		'wrapViews': true,
		'views': [],
		'init': function(wrapViews) {
			var self = this;
			self.wrapViews = CV.Optional(wrapViews, false);
			self.reload();
			self.selectIndex(0, 0);
			self.registerEvents();
		},
		'reload': function() {
			var self = this;
			self.views = [];
			
			var previousView = null;
			$('.collectionView').each(function(index, element) {
				var view = CV.CollectionView($(element));
				view.previousView = previousView;
				self.views.push(view);
				
				if(previousView != null) {
					previousView.nextView = view;
				}
				if(index == 0) {
					self.scrollOffset = view.$view.offset().top;
				}
				previousView = view;
			});
			
			// enable wrapping of views
			if(self.views.length > 0 && self.wrapViews) {
				var firstView = self.views[0];
				firstView.previousView = previousView;
				previousView.nextView = firstView;
			}
		},
		'selectedView': null,
		'selectView': function(view, selected) {
			var self = this;
			var willSelect = CV.Optional(selected, true);
			if(view != null) {
				if(self.selectedView != null) {
					self.selectedView.$view.removeClass('selected');
					self.selectedView.selectItem(self.selectedView.selectedItem, false);
				}
				if(willSelect) {
					self.selectedView = view;
					self.selectedView.$view.addClass('selected');
					self.selectedView.selectItemIndex(0);
				}
				return true;
			}
			return false;
		},
		'selectViewIndex': function(index, selected) {
			var self = this;
			var willSelect = CV.Optional(selected, true);
			var view = self.views[index];
			if(view != null) {
				return self.selectView(view, willSelect);
			}
			return false;
		},
		'select': function(view, item, selected) {
			var self = this;
			var willSelect = CV.Optional(selected, true);
			if(self.selectView(view, willSelect)) {
				self.selectedView.selectItem(item, willSelect);
				return true;
			}
			return false;
		},
		'selectIndex': function(viewIndex, itemIndex, selected) {
			var self = this;
			var willSelect = CV.Optional(selected, true);
			if(self.selectViewIndex(viewIndex, willSelect)) {
				self.selectedView.selectItemIndex(itemIndex, willSelect);
				return true;
			}
			return false
		},
		'next': function(animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			return self.navigateToView(function(view) {
				return view.nextView;
			}, function(view) {
				return view.items[0];
			}, willAnimate);
		},
		'previous': function(animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			return self.navigateToView(function(view) {
				return view.previousView;
			}, function(view) {
				return view.items[view.items.length - 1];
			}, willAnimate);
		},
		'navigateToView': function(getNextView, getNextItem, animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			var view = getNextView(self.selectedView);
			if(view != null) {
				var item = getNextItem(view);
				if(item != null) {
					self.select(view, item);
					if(willAnimate) {
						view.scrollTo(item);
					}
					return true;
				}
			}
			return false;
		},
		'nextRow': function(animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			return self.navigateToRow(function(view) {
				return view.nextView;
			}, function(view, item) {
				if(item === null || item === undefined) {
					if(view != null) {
						return view.items[0];
					}
					return null;
				}
				return item.nextItem;
			}, willAnimate);
		},
		'previousRow': function(animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			return self.navigateToRow(function(view) {
				return view.previousView;
			}, function(view, item) {
				if(item === null || item === undefined) {
					if(view != null) {
						return view.items[view.items.length - 1];
					}
					return null;
				}
				return item.previousItem;
			}, willAnimate);
		},
		'navigateToRow': function(getNextView, getNextItem, animated) {
			var self = this;
			var willAnimate = CV.Optional(animated, true);
			var currentOffset = self.selectedView.selectedItem.$view.offset();
			var currentTop = currentOffset.top;
			var currentLeft = currentOffset.left;
			var view = getNextView(self.selectedView);
			var item = getNextItem(view, null);
			var itemTop = currentTop;
			var selectedItem = null;
			var closest = Math.abs(Math.max());
			
			// Find closest view in next row
			while(item != null) {
				var itemOffset = item.$view.offset();
			
				if(currentTop == itemTop) {
					itemTop = itemOffset.top;
				}
				if(currentTop != itemTop && itemTop == itemOffset.top) {
					var itemLeft = itemOffset.left;
					var distance = Math.abs(currentLeft - itemLeft);
					if(distance < closest) {
						selectedItem = item;
						closest = distance;
					}
				}
				if(currentTop != itemTop && itemTop != itemOffset.top) {
					break;
				}
				
				item = getNextItem(view, item);
			}
			if(selectedItem != null) {
				CV.select(view, selectedItem, true)
				if(willAnimate) {
					view.scrollTo(selectedItem);
				}
				return true;
			}
			return false;
		},
		'scrollOffset': 0,
		'scrollTo': function(view) {
			var self = this;
			var scrollTop = view.$view.offset().top - self.scrollOffset;
			
			$('html, body').stop().animate({
				'scrollTop': scrollTop
			}, 350);
		},
		'registerEvents': function() {
			var self = this;
			
			$(document).keyup(function (event) {
				var selectedView = self.selectedView;
				
				if(event.keyCode == CV.EventKeys.UP_ARROW || event.keyCode == CV.EventKeys.W) {
					if(selectedView != null) {
						if(!selectedView.previousRow(true)) {
							CV.previousRow(true);
						}
					}
				}
				else if(event.keyCode == CV.EventKeys.LEFT_ARROW || event.keyCode == CV.EventKeys.A) {
					if(selectedView != null) {
						if(!selectedView.previous(true)) {
							CV.previous(true);
						}
					}
				}
				else if(event.keyCode == CV.EventKeys.DOWN_ARROW || event.keyCode == CV.EventKeys.S) {
					if(selectedView != null) {
						if(!selectedView.nextRow(true)) {
							CV.nextRow(true);
						}
					}
				}
				else if(event.keyCode == CV.EventKeys.RIGHT_ARROW || event.keyCode == CV.EventKeys.D) {
					if(selectedView != null) {
						if(!selectedView.next(true)) {
							CV.next(true);
						}
					}
				}
			});
		}
	};
	
	CV.CollectionView = function($element) {
		var view = {
			'$view': $element,
			'previousView': null,
			'nextView': null,
			'has3D': function() {
				var self = this;
				return self.$view.hasClass('3D');
			},
			'items': [],
			'selectedItem': null,
			'selectItem': function(item, selected) {
				var self = this;
				var willSelect = CV.Optional(selected, true);
				if(self.selectedItem != null) {
					self.selectedItem.$view.removeClass('selected');
				}
				if(willSelect) {
					self.selectedItem = item;
					self.selectedItem.$view.addClass('selected');
				}
			},
			'selectItemIndex': function(index, selected) {
				var self = this;
				var willSelect = CV.Optional(selected, true);
				var item = self.items[index];
				if(item != null) {
					self.selectItem(item, willSelect);
				}
			},
			'wrapItems': function() {
				var self = this;
				return self.$view.hasClass('wrap');
			},
			'reload': function() {
				var self = this;
				self.items = [];
			
				var previousItem = null;
				self.$view.children('.item').each(function(index, element) {
					var item = CV.CollectionViewItem(self, $(element));
					item.previousItem = previousItem;
					self.items.push(item);
			
					if(previousItem != null) {
						previousItem.nextItem = item;
					}
					previousItem = item;
				});
			
				// enable wrapping of items
				if(self.items.length > 0 && self.wrapItems()) {
					var firstItem = self.items[0];
					firstItem.previousItem = previousItem;
					previousItem.nextItem = firstItem;
				}
			},
			'next': function(animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				return self.navigateToItem(function(item) {
					return item.nextItem;
				}, willAnimate);
			},
			'previous': function(animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				return self.navigateToItem(function(item) {
					return item.previousItem;
				}, willAnimate);
			},
			'navigateToItem': function(getNextItem, animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				var item = getNextItem(self.selectedItem);
				if(item != null) {
					self.selectItem(item);
					if(willAnimate) {
						self.scrollTo(item);
					}
					return true;
				}
				return false;
			},
			'nextRow': function(animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				return self.navigateToRow(function(item) {
					return item.nextItem;
				}, willAnimate);
			},
			'previousRow': function(animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				return self.navigateToRow(function(item) {
					return item.previousItem;
				}, willAnimate);
			},
			'navigateToRow': function(getNextItem, animated) {
				var self = this;
				var willAnimate = CV.Optional(animated, true);
				var currentTop = self.selectedItem.$view.offset().top;
				var currentLeft = self.selectedItem.$view.offset().left;
				var item = getNextItem(self.selectedItem);
				var itemTop = currentTop;
				var selectedItem = null;
				var closest = Math.abs(Math.max());
			
				// Find closest view in next row
				while(item != null) {
					var itemOffset = item.$view.offset();
				
					if(currentTop == itemTop) {
						itemTop = itemOffset.top;
					}
					if(currentTop != itemTop && itemTop == itemOffset.top) {
						var itemLeft = itemOffset.left;
						var distance = Math.abs(currentLeft - itemLeft);
						if(distance < closest) {
							selectedItem = item;
							closest = distance;
						}
					}
					if(currentTop != itemTop && itemTop != itemOffset.top) {
						break;
					}
				
					item = getNextItem(item);
				}
				if(selectedItem != null) {
					self.selectItem.call(self, selectedItem);
					if(willAnimate) {
						self.scrollTo(selectedItem);
					}
					return true;
				}
				return false;
			},
			'scrollTo': function(item) {
				var self = this;
				var scrollTop = item.$view.offset().top - CV.scrollOffset;
				
				$('html, body').stop().animate({
					'scrollTop': scrollTop
				}, 350);
			}
		};
		
		view.reload();
		return view;
	};
	
	window.CV.CollectionViewItem = function(collectionView, $view) {
		var $content = $view.children('.content').first();
		var $layers = $content.children('.layers').first();
		var $shadow = $content.children('.shadow').first();
		var $glow = $layers.children('.glow').first();
		var $title = $view.children('.title').first();
		
		var item = {
			'collectionView': collectionView,
			'previousItem': null,
			'nextItem': null,
			'$view': $view,
			'$content': $content,
			'$layers': $layers,
			'$shadow': $shadow,
			'$glow': $glow,
			'$title': $title,
			'translate': CV.point(10, 10),
			'rotate': CV.point(5, 5),
			'scale': CV.point(0.925, 0.925),
			'reset': function(event) {
				var self = this;
				self.$layers.css('transform', '');
				self.$shadow.css('transform', '');
			
				var layers = self.$layers.children();
				layers.each(function(index, element) {
					$(element).css('transform', '');
				});
			},
			'scalePoint': function() {
				var self = this;
				return self.scale;
			},
			'translatePoint': function(offset, multiplier) {
				var self = this;
				
				return offset.negate()
							 .multiply(self.translate)
							 .multiplyScalar(multiplier)
							 .range(self.translate, true);
			},
			'rotatePoint': function(offset, multiplier) {
				var self = this;
				
				return offset.flip()
							 .multiplyScalars(-1, 1)
							 .multiply(self.rotate)
							 .multiplyScalar(multiplier)
							 .range(self.rotate, true);
			},
			'glowPoint': function(viewFrame, viewPoint) {
				var size = viewFrame.size.multiplyScalar(0.5);
				return viewPoint.subtractSize(size)
			},
			'transformLayers': function(translatePoint) {
				var self = this;
				var multiplier = 0.5
				var layers = self.$layers.children();
				layers.each(function(index, element) {
					var $layer = $(element)
					if(!$layer.hasClass('glow') && !$layer.hasClass('innerBorder')) {
						var layerMultiplier = Math.max(multiplier, 0);
						var layerTranslatePoint = translatePoint.multiplyScalar(layerMultiplier);
						
						var transform = "translate3d(" + layerTranslatePoint.x + "px," + layerTranslatePoint.y + "px, 0px)";
						$layer.css('transform', transform);
						multiplier -= 0.1;
					}
				});
			},
			'transform': function(event) {
				var self = this;
				var eventPoint = CV.point(event.pageX, event.pageY);
				var viewFrame = self.$view.frame()
				var viewPoint = viewFrame.convert(eventPoint);
			
				if(!self.collectionView.has3D() || !viewFrame.contains(viewPoint)) {
					self.reset();
					return
				}
				
				// apply transform to $view
				var multiplier = 1;
				var offset = viewFrame.normalize(viewPoint);
			
				var scalePoint = self.scalePoint();
				var scale = 'scale(' + scalePoint.x + ', ' + scalePoint.y + ')';
			
				var translatePoint = self.translatePoint(offset, multiplier);
				var translate = 'translateX(' + translatePoint.x + 'px)' + ' ' + 'translateY(' + translatePoint.y + 'px)';
			
				var rotatePoint = self.rotatePoint(offset, multiplier);
				var rotate = 'rotateX(' + rotatePoint.x + 'deg)' + ' ' + 'rotateY(' + rotatePoint.y + 'deg)';
			
				var transform = scale + ' ' + translate + ' ' + rotate;
				self.$layers.css('transform', transform);
				self.$shadow.css('transform', transform);
			
				self.transformLayers(translatePoint);
				
				var glowPoint = self.glowPoint(viewFrame, viewPoint);
				self.$glow.css('transform', 'translate3d(' + glowPoint.x + 'px, ' + glowPoint.y + 'px, 0px)');
			},
			'registerEvents': function() {
				var self = this;
				self.$view.on('mouseover', function(event) {
					if(self.collectionView != null) {
						CV.select(self.collectionView, self)
					}
				}).on('mousemove', function(event) {
					self.transform(event);
				}).on('mousedown', function(event) {
					self.transform(event);
				}).on('mouseleave', function(event) {
					self.reset(event);
				}).on('mouseup', function(event) {
					self.reset(event);
				}).on('touchstart', function(event) {
					CV.disableScroll = true;
					if(self.collectionView != null) {
						CV.select(self.collectionView, self)
					}
				}).on('touchmove', function(event) {
					var touchEvent = event.originalEvent.targetTouches[0];
					self.transform(touchEvent);
				}).on('touchend', function(event) {
					var touchEvent = event.originalEvent.targetTouches[0];
					self.reset(touchEvent);
					CV.disableScroll = false;
				}).on('touchcancel', function(event) {
					var touchEvent = event.originalEvent.targetTouches[0];
					self.reset(touchEvent);
					CV.disableScroll = false;
				}).click(function(event) {
					var $metadata = self.$view.children('div.metadata').first();
					$metadata.children().each(function(index, element) {
						var $div = $(element);
						if($div.attr('itemprop') == 'url') {
							var url = $div.html();
							if(url.length > 0) {
								window.location.href = url;
							}
						}
					});
				});
				
				$(window).on('touchmove', function(event) {
					if(CV.disableScroll) {
						event.preventDefault();
						return;
					}
				});
			}
		};
		
		item.registerEvents();
        return item;
	};
})(jQuery);
