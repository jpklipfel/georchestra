Ext.namespace("GEOR.Addons");

GEOR.Addons.Extractor = function(map, options) {
    this.map = map;
    this.options = options;
};

GEOR.Addons.Extractor.prototype = {
    win: null,
    jsonFormat: null,

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        var lang = OpenLayers.Lang.getCode();
        this.jsonFormat = new OpenLayers.Format.JSON();
        /*
        not used for now
        this.layer = new OpenLayers.Layer.Vector("addon_extractor_vectors", {
            displayInLayerSwitcher: false,
            styleMap: new OpenLayers.StyleMap({
                "default": {
                    graphicName: "cross",
                    pointRadius: 16,
                    strokeColor: "fuchsia",
                    strokeWidth: 2,
                    fillOpacity: 0
                }
            })
        });
        */
        // return menu item:
        this.item = new Ext.menu.Item({
            text: record.get("title")[lang] || record.get("title")["en"],
            qtip: record.get("description")[lang] || record.get("description")["en"],
            iconCls: 'extractor-icon',
            handler: this.showWindow,
            scope: this
        });
        return this.item;
    },

    showWindow: function() {
        if (!this.win) {
            // TODO: factorize
            this.srsField = new Ext.form.ComboBox({
                name: "srs",
                forceSelection: true,
                editable: false,
                triggerAction: 'all',
                fieldLabel: 'SRS',
                mode: 'local',
                valueField: 'value',
                displayField: 'text',
                value: "EPSG:4326",
                store: new Ext.data.SimpleStore({
                    fields: ['value', 'text'],
                    data: [
                        ["EPSG:4326", "WGS84 (EPSG:4326)"],
                        ["EPSG:2154", "Lambert 93 (EPSG:2154)"]
                    ]
                })
            });
            this.vectorFormatField = new Ext.form.ComboBox({
                name: "vectorFormat",
                forceSelection: true,
                editable: false,
                triggerAction: 'all',
                fieldLabel: 'Format for vectors',
                mode: 'local',
                valueField: 'value',
                displayField: 'text',
                value: "shp",
                store: new Ext.data.SimpleStore({
                    fields: ['value', 'text'],
                    data: [
                        ["shp", "Shapefile"],
                        ["mif", "Mif/Mid"],
                        ["tab", "TAB"],
                        ["kml", "KML"]
                    ]
                })
            });
            this.rasterFormatField = new Ext.form.ComboBox({
                name: "rasterFormat",
                forceSelection: true,
                editable: false,
                triggerAction: 'all',
                fieldLabel: 'Format for rasters',
                mode: 'local',
                valueField: 'value',
                displayField: 'text',
                value: "geotiff",
                store: new Ext.data.SimpleStore({
                    fields: ['value', 'text'],
                    data: [
                        ["geotiff", "GeoTiff"],
                        ["tiff", "Tif + TFW"]
                    ]
                })
            });
            this.resField = new Ext.form.NumberField({
                name: "resolution",
                value: 50,
                fieldLabel: 'Resolution for rasters (cm)',
                decimalPrecision: 2
            });
            this.emailField = new Ext.form.TextField({
                name: "email",
                allowBlank: false,
                value: GEOR.config.USEREMAIL,
                fieldLabel: 'Email'
            });
            // TODO: wizard style (1 choose extent 2 choose formats 3 enter email )
            this.win = new Ext.Window({
                closable: true,
                closeAction: 'hide',
                width: 330,
                height: 250,
                title: OpenLayers.i18n("addon_extractor_popup_title"),
                border: false,
                buttonAlign: 'left',
                layout: 'fit',
                items: [{
                    xtype: 'form',
                    bodyStyle: "padding:5px;",
                    items: [this.srsField, this.vectorFormatField, this.rasterFormatField, this.resField, this.emailField]
                }],
                fbar: ['->', {
                    text: OpenLayers.i18n("Close"),
                    handler: function() {
                        this.win.hide();
                    },
                    scope: this
                }, {
                    text: OpenLayers.i18n("Extract"),
                    handler: this.extract,
                    scope: this
                }],
                listeners: {
                    "hide": function() {
                        //this.map.removeLayer(this.layer);
                    },
                    scope: this
                }
            });
        }
        //this.map.addLayer(this.layer);
        this.win.show();
    },

    doExtract: function(okLayers) {
        var spec = {
            "emails": [this.emailField.getValue()],
            "globalProperties": {
                "projection": this.srsField.getValue(),
                "resolution": parseInt(this.resField.getValue())/100,
                "rasterFormat": this.rasterFormatField.getValue(),
                "vectorFormat": this.vectorFormatField.getValue(),
                "bbox": {
                    "srs": this.map.getProjection(),
                    // TODO: display BBOX in vectorLayer + modifyFeature Control
                    "value": this.map.getExtent().toArray()
                }
            },
            "layers": okLayers
        };
        GEOR.waiter.show();
        Ext.Ajax.request({
            url: "/extractorapp/initiate", // TODO: param
            success: function(response) {
                if (response.responseText &&
                    response.responseText.indexOf('<success>true</success>') > 0) {
                    this.win.hide();
                    GEOR.util.infoDialog({
                        msg: OpenLayers.i18n('The extraction request succeeded, check your email.')
                    });
                } else {
                    this.win.hide();
                    GEOR.util.errorDialog({
                        msg: OpenLayers.i18n('The extraction request failed.')
                    });
                }
            },
            failure: function(response) {
                this.win.hide();
                GEOR.util.errorDialog({
                    msg: OpenLayers.i18n('The extraction request failed.')
                });
            },
            jsonData: this.jsonFormat.write(spec),
            scope: this
        });
    },

    extract: function() {
        var email = this.emailField.getValue();
        if (!email) {
            // todo: msg
            return;
        }
        var okLayers = [], nokLayers = [], count = this.map.layers.length;
        Ext.each(this.map.layers, function(layer) {
            if (!layer.getVisibility() || !layer.url) {
                count--;
                return;
            }
            GEOR.waiter.show();
            GEOR.ows.WMSDescribeLayer(layer, {
                success: function(store, records) {
                    count--;
                    var r, match = null;
                    for (var i=0, len = records.length; i<len; i++) {
                        r = records[i];
                        if ((r.get("owsType") == "WFS" || r.get("owsType") == "WCS") &&
                            r.get("owsURL") &&
                            r.get("typeName")) {

                            match = {
                                "owsUrl": r.get("owsURL"),
                                "owsType": r.get("owsType"),
                                "layerName": r.get("typeName")
                            };
                            break;
                        }
                    }
                    if (match) {
                        okLayers.push(match);
                    } else {
                        nokLayers.push(layer);
                    }
                    if (count === 0) {
                        this.doExtract(okLayers);
                    }
                },
                failure: function() {
                    count--;
                    nokLayers.push(layer);
                    if (count === 0) {
                        this.doExtract(okLayers);
                    }
                },
                scope: this
            });
        }, this);
    },

    destroy: function() {
        this.win.hide();
        //this.layer = null;
        this.map = null;
    }
};