import {Component, OnInit} from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import {AppSettingsService} from './appSettings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private appSettingsService: AppSettingsService
  ) { }

  title = 'xpo-poc-mapboxgl';
  lng = -74.50;
  lat = 40;
  map: mapboxgl.Map;

  ngOnInit() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiemRheWFyIiwiYSI6ImNqdThveXZ1bTI3Y2g0ZHBnOWV6aGRvaXEifQ.K5xuWiwPyaNOuzPHrwiUJg';

    /// locate the user
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        this.map.flyTo({
          center: [this.lng, this.lat]
        });
      });
    }

    this.map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location,
      center: [this.lng, this.lat], // starting position [lng, lat]
      zoom: 9 // starting zoom
    });

    /// Add map controls
    this.map.addControl(new mapboxgl.NavigationControl());

    // Add zip code numbers on the map
    this.appSettingsService.getJSON().subscribe(zipcodes => {
      this.map.addSource('zipcodes', {
        type: 'geojson',
        data: zipcodes
      });

      // console.log(zipcodes);

      this.map.addLayer({
        id: 'zipcodes',
        type: 'symbol',
        source: 'zipcodes',
        layout: {
          'text-field': '{zip}',
          'text-size': 18,
          'text-transform': 'uppercase',
          'icon-image': 'rocket-15',
          'text-offset': [0, 1.5]
        },
        paint: {
          'text-color': '#f16624',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      });

      // Add zip code areas to the map
      this.map.addSource('zips', {
        type: 'vector',
        url: 'mapbox://jn1532.2z2q31r2'
      });

      this.map.addLayer({
          id:     'Zip',
          type:   'fill',
          source: 'zips',
          layout: {
            visibility: 'visible'
          },
          paint:  {
            'fill-outline-color': '#696969',
            'fill-color': {
              property: 'fill'    ,
              type: 'identity'
            },
            'fill-opacity': .65
          },
          'source-layer': 'zip5_topo_color-2bf335'


        },
        'water'  /// 'water'   helps the transparency
      );


      // When a click event occurs on a feature in the places layer, open a popup at the
      // location of the feature, with description HTML from its properties.
      this.map.on('click', 'zipcodes', (e) => {
        // console.log(e);
        const coordinates = e.features[0].geometry.coordinates.slice();
        const city = e.features[0].properties.city;
        const state = e.features[0].properties.state;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup({closeOnClick: true})
          .setLngLat(coordinates)
          .setHTML(coordinates[0].toFixed(2) + ', ' + coordinates[1].toFixed(2) + ': ' + city + ', ' + state)
          .addTo(this.map);
      });

      // Change the cursor to a pointer when the mouse is over the places layer.
      this.map.on('mouseenter', 'zipcodes', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });

      // Change it back to a pointer when it leaves.
      this.map.on('mouseleave', 'zipcodes', () => {
        this.map.getCanvas().style.cursor = '';
      });

    });
  }
}
