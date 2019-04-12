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
  mapboxToken = 'pk.eyJ1IjoiemRheWFyIiwiYSI6ImNqdThveXZ1bTI3Y2g0ZHBnOWV6aGRvaXEifQ.K5xuWiwPyaNOuzPHrwiUJg';
  // default center for map.
  lng = -74.50;
  lat = 40;
  map: mapboxgl.Map;
  zipCodes = []; // used in search/filter logic
  filterEl: HTMLElement; // used in search/filter logic
  listingEl: HTMLElement; // used in search/filter logic

  ngOnInit() {
    mapboxgl.accessToken = this.mapboxToken;

    // set up the elements for filtering/searching
    this.filterEl = document.getElementById('feature-filter');
    this.listingEl = document.getElementById('feature-listing');

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

    // create the base map
    this.map = new mapboxgl.Map({
      container: 'map', // container id
      // style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location,
      style: 'mapbox://styles/zdayar/cju8vldpq496t1fno7l6k307e',
      center: [this.lng, this.lat], // starting position [lng, lat]
      zoom: 10 // starting zoom
    });

    // When map is loaded
    this.map.on('load', () => {
      /// Add map controls
      this.map.addControl(new mapboxgl.NavigationControl());

      // Add zip code numbers on the map -- the OLD way -- using the zipcodes.geojson file
      // this.appSettingsService.getJSON().subscribe(zipcodes => {
      /*this.map.addSource('zipcodes', {
        type: 'geojson',
        data: zipcodes
      });*/

      /*this.map.addLayer({
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
      });*/

      // Add zip code areas to the map
      this.map.addSource('zips', {
        type: 'vector',
        url: 'mapbox://jn1532.2z2q31r2'
      });

      this.map.addLayer({
          id: 'Zip',
          type: 'fill',
          source: 'zips',
          layout: {
            visibility: 'visible'
          },
          paint: {
            'fill-outline-color': '#696969',
            'fill-color': {
              property: 'fill',
              type: 'identity'
            },
            'fill-opacity': .65
          },
          'source-layer': 'zip5_topo_color-2bf335'


        },
        'water'  /// 'water'   helps the transparency
      );

      // Add zip code numbers to the map - NEW way - using the properties in the mapbox vector data
      this.map.addLayer({
        id: 'zipcodes',
        type: 'symbol',
        source: 'zips',
        layout: {
          'text-field': '{ZIP5}',
          'text-size': 18,
          'text-transform': 'uppercase',
          'icon-image': 'rocket-15',
          'icon-padding': 0,
          'icon-allow-overlap': true,
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#f16624',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        },
        'source-layer': 'zip5_topo_color-2bf335'
      });


      // Display zip codes list for visible map area
      this.map.on('moveend', () => {
        console.log('moveend');

        // find features that are currently displayed
        const features = this.map.queryRenderedFeatures({layers: ['zipcodes']});
        console.log(features);

        if (features) {
          // eliminate duplicates if needed
          const uniqueFeatures = this.getUniqueFeatures(features, 'ZIP5');
          // console.log(uniqueFeatures);
          // Populate features for the listing overlay.
          this.renderListings(uniqueFeatures);

          // Clear the input container
          (this.filterEl as any).value = '';

          // Store the current features in `zipCodes` array to
          // later use for filtering on `keyup`.
          this.zipCodes = uniqueFeatures;
        }
      });

      // Process user input for filtering/searching
      this.filterEl.addEventListener('keyup', () => {
        // find out what user entered
        const value = (this.filterEl as any).value;
        // console.log(value);

        // Filter out visible features that don't match the input value.
        const filtered = this.zipCodes.filter(feature => {
          const zip = feature.properties.ZIP5;
          return zip.indexOf(value) > -1;
        });

        // Populate the sidebar with filtered results
        this.renderListings(filtered);

        // filter the layers of the map
        if (filtered.length > 0) {
          // Set the filter to populate features into the layer.
          this.map.setFilter('zipcodes', ['match', ['get', 'ZIP5'], filtered.map(feature => {
            return feature.properties.ZIP5;
          }), true, false]);

          this.map.setFilter('Zip', ['match', ['get', 'ZIP5'], filtered.map(feature => {
            return feature.properties.ZIP5;
          }), true, false]);
        }
      });

      // Call this function on initialization
      // passing an empty array to render an empty state
      this.renderListings([]);


      // Code for OLD WAY of getting zip code numbers
      // When a click event occurs on a feature in the zipcodes layer, open a popup at the
      // location of the feature, with description HTML from its properties.
      /*this.map.on('click', 'zipcodes', (e) => {

        const zipNumbers = this.map.queryRenderedFeatures({layers: ['zipcodes']});
        console.log(zipNumbers);

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
      });*/


      /* // When user clicks in a zip code area, show a pop-up with zip code number -- NOT VERY USEFUL
         // Commented out because I am now displaying the zip code numbers in the zip code areas
        this.map.on('click', (e) => {
        const zipAreas = this.map.queryRenderedFeatures(e.point);
        console.log(zipAreas);
        console.log(e);

        let zip = zipAreas[0].properties.ZIP5;
        // if they clicked on town name
        if (zip === undefined) {
          zip = zipAreas[1].properties.ZIP5;
        }
        console.log(zip);

        new mapboxgl.Popup({closeOnClick: true})
          .setLngLat(e.lngLat)
          .setHTML(zip)
          .addTo(this.map);
      });*/

      // });
    });
  }

  renderListings(features): void {
    // Clear any existing listings
    this.listingEl.innerHTML = '';

    if (features.length) {
      features.forEach(feature => {
        const prop = feature.properties;
        const item = document.createElement('div');
        // console.log(prop.ZIP5);
        item.textContent = prop.ZIP5;
        this.listingEl.appendChild(item);
      });

      // Show the filter input
      (this.filterEl.parentNode as any).style.display = 'block';
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'Drag the map to populate results';
      this.listingEl.appendChild(empty);

      // Hide the filter input
      (this.filterEl.parentNode as any).style.display = 'none';
    }
  }

  getUniqueFeatures(array, comparatorProperty): any {
    const existingFeatureKeys = {};
    // Because features come from tiled vector data, feature geometries may be split
    // or duplicated across tile boundaries and, as a result, features may appear
    // multiple times in query results.
    const uniqueFeatures = array.filter(el => {
      if (existingFeatureKeys[el.properties[comparatorProperty]]) {
        return false;
      } else {
        existingFeatureKeys[el.properties[comparatorProperty]] = true;
        return true;
      }
    });

    return uniqueFeatures;
  }

  onClearFilter() {
    this.map.setFilter('zipcodes');

    this.map.setFilter('Zip');
  }
}
