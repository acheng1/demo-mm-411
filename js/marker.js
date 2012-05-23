function Marker(opt_options, className) {
    this.setValues(opt_options);
   
    var img = this.img_ = document.createElement('img');
    img.className = className;
   
    var div = this.div_ = document.createElement('div');
    div.appendChild(img);
    div.style.cssText = 'position: absolute; display: none;';
};
Marker.prototype = new google.maps.OverlayView;

Marker.prototype.onAdd = function() {
    var pane = this.getPanes().overlayLayer;
    pane.appendChild(this.div_);
   
    var me = this;
    this.listeners_ = [
        google.maps.event.addListener(this, 'position_changed',
            function() { me.draw(); }),
    ];
};

Marker.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    for (var i = 0, I = this.listeners_.length; i < I; ++i) {
        google.maps.event.removeListener(this.listeners_[i]);
    }
};

Marker.prototype.draw = function() {
    var projection = this.getProjection();
    var position = projection.fromLatLngToDivPixel(this.get('position'));
   
    var div = this.div_;
    div.style.left = position.x + 'px';
    div.style.top = position.y + 'px';
    div.style.display = 'block';
};
