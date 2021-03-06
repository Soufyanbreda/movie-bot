'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var nearestVector = _interopDefault(require('ml-nearest-vector'));
var Random = _interopDefault(require('ml-random'));
var mlDistanceEuclidean = require('ml-distance-euclidean');
var mlMatrix = require('ml-matrix');

/**
 * Calculates the distance matrix for a given array of points
 * @ignore
 * @param {Array<Array<number>>} data - the [x,y,z,...] points to cluster
 * @param {function} distance - Distance function to use between the points
 * @return {Array<Array<number>>} - matrix with the distance values
 */
function calculateDistanceMatrix(data, distance) {
  var distanceMatrix = new Array(data.length);
  for (var i = 0; i < data.length; ++i) {
    for (var j = i; j < data.length; ++j) {
      if (!distanceMatrix[i]) {
        distanceMatrix[i] = new Array(data.length);
      }
      if (!distanceMatrix[j]) {
        distanceMatrix[j] = new Array(data.length);
      }
      const dist = distance(data[i], data[j]);
      distanceMatrix[i][j] = dist;
      distanceMatrix[j][i] = dist;
    }
  }
  return distanceMatrix;
}

/**
 * Updates the cluster identifier based in the new data
 * @ignore
 * @param {Array<Array<number>>} data - the [x,y,z,...] points to cluster
 * @param {Array<Array<number>>} centers - the K centers in format [x,y,z,...]
 * @param {Array <number>} clusterID - the cluster identifier for each data dot
 * @param {function} distance - Distance function to use between the points
 * @return {Array} the cluster identifier for each data dot
 */
function updateClusterID(data, centers, clusterID, distance) {
  for (var i = 0; i < data.length; i++) {
    clusterID[i] = nearestVector(centers, data[i], {
      distanceFunction: distance
    });
  }
  return clusterID;
}

/**
 * Update the center values based in the new configurations of the clusters
 * @ignore
 * @param {Array<Array<number>>} prevCenters - Centroids from the previous iteration
 * @param {Array <Array <number>>} data - the [x,y,z,...] points to cluster
 * @param {Array <number>} clusterID - the cluster identifier for each data dot
 * @param {number} K - Number of clusters
 * @return {Array} he K centers in format [x,y,z,...]
 */
function updateCenters(prevCenters, data, clusterID, K) {
  const nDim = data[0].length;

  // copy previous centers
  var centers = new Array(K);
  var centersLen = new Array(K);
  for (var i = 0; i < K; i++) {
    centers[i] = new Array(nDim);
    centersLen[i] = 0;
    for (var j = 0; j < nDim; j++) {
      centers[i][j] = 0;
    }
  }

  // add the value for all dimensions of the point
  for (var l = 0; l < data.length; l++) {
    centersLen[clusterID[l]]++;
    for (var dim = 0; dim < nDim; dim++) {
      centers[clusterID[l]][dim] += data[l][dim];
    }
  }

  // divides by length
  for (var id = 0; id < K; id++) {
    for (var d = 0; d < nDim; d++) {
      if (centersLen[id]) {
        centers[id][d] /= centersLen[id];
      } else {
        centers[id][d] = prevCenters[id][d];
      }
    }
  }
  return centers;
}

/**
 * The centers have moved more than the tolerance value?
 * @ignore
 * @param {Array<Array<number>>} centers - the K centers in format [x,y,z,...]
 * @param {Array<Array<number>>} oldCenters - the K old centers in format [x,y,z,...]
 * @param {function} distanceFunction - Distance function to use between the points
 * @param {number} tolerance - Allowed distance for the centroids to move
 * @return {boolean}
 */
function hasConverged(centers, oldCenters, distanceFunction, tolerance) {
  for (var i = 0; i < centers.length; i++) {
    if (distanceFunction(centers[i], oldCenters[i]) > tolerance) {
      return false;
    }
  }
  return true;
}

/**
 * Choose K different random points from the original data
 * @ignore
 * @param {Array<Array<number>>} data - Points in the format to cluster [x,y,z,...]
 * @param {number} K - number of clusters
 * @param {number} seed - seed for random number generation
 * @return {Array<Array<number>>} - Initial random points
 */
function random(data, K, seed) {
  const random = new Random(seed);
  return random.choice(data, { size: K });
}

/**
 * Chooses the most distant points to a first random pick
 * @ignore
 * @param {Array<Array<number>>} data - Points in the format to cluster [x,y,z,...]
 * @param {number} K - number of clusters
 * @param {Array<Array<number>>} distanceMatrix - matrix with the distance values
 * @param {number} seed - seed for random number generation
 * @return {Array<Array<number>>} - Initial random points
 */
function mostDistant(data, K, distanceMatrix, seed) {
  const random = new Random(seed);
  var ans = new Array(K);
  // chooses a random point as initial cluster
  ans[0] = Math.floor(random.random() * data.length);

  if (K > 1) {
    // chooses the more distant point
    var maxDist = { dist: -1, index: -1 };
    for (var l = 0; l < data.length; ++l) {
      if (distanceMatrix[ans[0]][l] > maxDist.dist) {
        maxDist.dist = distanceMatrix[ans[0]][l];
        maxDist.index = l;
      }
    }
    ans[1] = maxDist.index;

    if (K > 2) {
      // chooses the set of points that maximises the min distance
      for (var k = 2; k < K; ++k) {
        var center = { dist: -1, index: -1 };
        for (var m = 0; m < data.length; ++m) {
          // minimum distance to centers
          var minDistCent = { dist: Number.MAX_VALUE, index: -1 };
          for (var n = 0; n < k; ++n) {
            if (
              distanceMatrix[n][m] < minDistCent.dist &&
              ans.indexOf(m) === -1
            ) {
              minDistCent = {
                dist: distanceMatrix[n][m],
                index: m
              };
            }
          }

          if (
            minDistCent.dist !== Number.MAX_VALUE &&
            minDistCent.dist > center.dist
          ) {
            center = Object.assign({}, minDistCent);
          }
        }

        ans[k] = center.index;
      }
    }
  }

  return ans.map((index) => data[index]);
}

// Implementation inspired from scikit
function kmeanspp(X, K, options = {}) {
  X = new mlMatrix.Matrix(X);
  const nSamples = X.length;
  const random = new Random(options.seed);
  // Set the number of trials
  const centers = [];
  const localTrials = options.localTrials || 2 + Math.floor(Math.log(K));

  // Pick the first center at random from the dataset
  const firstCenterIdx = random.randInt(nSamples);
  centers.push(X[firstCenterIdx].slice());

  // Init closest distances
  let closestDistSquared = [X.map((x) => mlDistanceEuclidean.squaredEuclidean(x, centers[0]))];
  let cumSumClosestDistSquared = [cumSum(closestDistSquared[0])];
  const factor = 1 / cumSumClosestDistSquared[0][nSamples - 1];
  let probabilities = mlMatrix.Matrix.mul(closestDistSquared, factor);

  // Iterate over the remaining centers
  for (let i = 1; i < K; i++) {
    const candidateIdx = random.choice(nSamples, {
      replace: true,
      size: localTrials,
      probabilities: probabilities[0]
    });

    const candidates = X.selection(candidateIdx, range(X[0].length));
    const distanceToCandidates = euclidianDistances(candidates, X);

    let bestCandidate;
    let bestPot;
    let bestDistSquared;

    for (let j = 0; j < localTrials; j++) {
      const newDistSquared = mlMatrix.Matrix.min(closestDistSquared, [distanceToCandidates[j]]);
      const newPot = newDistSquared.sum();
      if (bestCandidate === undefined || newPot < bestPot) {
        bestCandidate = candidateIdx[j];
        bestPot = newPot;
        bestDistSquared = newDistSquared;
      }
    }
    centers[i] = X[bestCandidate].slice();
    closestDistSquared = bestDistSquared;
    cumSumClosestDistSquared = [cumSum(closestDistSquared[0])];
    probabilities = mlMatrix.Matrix.mul(
      closestDistSquared,
      1 / cumSumClosestDistSquared[0][nSamples - 1]
    );
  }
  return centers;
}

function euclidianDistances(A, B) {
  const result = new mlMatrix.Matrix(A.length, B.length);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      result.set(i, j, mlDistanceEuclidean.squaredEuclidean(A.getRow(i), B.getRow(j)));
    }
  }
  return result;
}

function range(l) {
  let r = [];
  for (let i = 0; i < l; i++) {
    r.push(i);
  }
  return r;
}

function cumSum(arr) {
  let cumSum = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    cumSum[i] = cumSum[i - 1] + arr[i];
  }
  return cumSum;
}

const distanceSymbol = Symbol('distance');

class KMeansResult {
  /**
   * Result of the kmeans algorithm
   * @param {Array<number>} clusters - the cluster identifier for each data dot
   * @param {Array<Array<object>>} centroids - the K centers in format [x,y,z,...], the error and size of the cluster
   * @param {boolean} converged - Converge criteria satisfied
   * @param {number} iterations - Current number of iterations
   * @param {function} distance - (*Private*) Distance function to use between the points
   * @constructor
   */
  constructor(clusters, centroids, converged, iterations, distance) {
    this.clusters = clusters;
    this.centroids = centroids;
    this.converged = converged;
    this.iterations = iterations;
    this[distanceSymbol] = distance;
  }

  /**
   * Allows to compute for a new array of points their cluster id
   * @param {Array<Array<number>>} data - the [x,y,z,...] points to cluster
   * @return {Array<number>} - cluster id for each point
   */
  nearest(data) {
    const clusterID = new Array(data.length);
    const centroids = this.centroids.map(function (centroid) {
      return centroid.centroid;
    });
    return updateClusterID(data, centroids, clusterID, this[distanceSymbol]);
  }

  /**
   * Returns a KMeansResult with the error and size of the cluster
   * @ignore
   * @param {Array<Array<number>>} data - the [x,y,z,...] points to cluster
   * @return {KMeansResult}
   */
  computeInformation(data) {
    var enrichedCentroids = this.centroids.map(function (centroid) {
      return {
        centroid: centroid,
        error: 0,
        size: 0
      };
    });

    for (var i = 0; i < data.length; i++) {
      enrichedCentroids[this.clusters[i]].error += this[distanceSymbol](
        data[i],
        this.centroids[this.clusters[i]]
      );
      enrichedCentroids[this.clusters[i]].size++;
    }

    for (var j = 0; j < this.centroids.length; j++) {
      if (enrichedCentroids[j].size) {
        enrichedCentroids[j].error /= enrichedCentroids[j].size;
      } else {
        enrichedCentroids[j].error = null;
      }
    }

    return new KMeansResult(
      this.clusters,
      enrichedCentroids,
      this.converged,
      this.iterations,
      this[distanceSymbol]
    );
  }
}

const defaultOptions = {
  maxIterations: 100,
  tolerance: 1e-6,
  withIterations: false,
  initialization: 'kmeans++',
  distanceFunction: mlDistanceEuclidean.squaredEuclidean
};

/**
 * Each step operation for kmeans
 * @ignore
 * @param {Array<Array<number>>} centers - K centers in format [x,y,z,...]
 * @param {Array<Array<number>>} data - Points [x,y,z,...] to cluster
 * @param {Array<number>} clusterID - Cluster identifier for each data dot
 * @param {number} K - Number of clusters
 * @param {object} [options] - Option object
 * @param {number} iterations - Current number of iterations
 * @return {KMeansResult}
 */
function step(centers, data, clusterID, K, options, iterations) {
  clusterID = updateClusterID(
    data,
    centers,
    clusterID,
    options.distanceFunction
  );
  var newCenters = updateCenters(centers, data, clusterID, K);
  var converged = hasConverged(
    newCenters,
    centers,
    options.distanceFunction,
    options.tolerance
  );
  return new KMeansResult(
    clusterID,
    newCenters,
    converged,
    iterations,
    options.distanceFunction
  );
}

/**
 * Generator version for the algorithm
 * @ignore
 * @param {Array<Array<number>>} centers - K centers in format [x,y,z,...]
 * @param {Array<Array<number>>} data - Points [x,y,z,...] to cluster
 * @param {Array<number>} clusterID - Cluster identifier for each data dot
 * @param {number} K - Number of clusters
 * @param {object} [options] - Option object
 */
function* kmeansGenerator(centers, data, clusterID, K, options) {
  var converged = false;
  var stepNumber = 0;
  var stepResult;
  while (!converged && stepNumber < options.maxIterations) {
    stepResult = step(centers, data, clusterID, K, options, ++stepNumber);
    yield stepResult.computeInformation(data);
    converged = stepResult.converged;
    centers = stepResult.centroids;
  }
}

/**
 * K-means algorithm
 * @param {Array<Array<number>>} data - Points in the format to cluster [x,y,z,...]
 * @param {number} K - Number of clusters
 * @param {object} [options] - Option object
 * @param {number} [options.maxIterations = 100] - Maximum of iterations allowed
 * @param {number} [options.tolerance = 1e-6] - Error tolerance
 * @param {boolean} [options.withIterations = false] - Store clusters and centroids for each iteration
 * @param {function} [options.distanceFunction = squaredDistance] - Distance function to use between the points
 * @param {number} [options.seed] - Seed for random initialization.
 * @param {string|Array<Array<number>>} [options.initialization = 'kmeans++'] - K centers in format [x,y,z,...] or a method for initialize the data:
 *  * You can either specify your custom start centroids, or select one of the following initialization method:
 *  * `'kmeans++'` will use the kmeans++ method as described by http://ilpubs.stanford.edu:8090/778/1/2006-13.pdf
 *  * `'random'` will choose K random different values.
 *  * `'mostDistant'` will choose the more distant points to a first random pick
 * @return {KMeansResult} - Cluster identifier for each data dot and centroids with the following fields:
 *  * `'clusters'`: Array of indexes for the clusters.
 *  * `'centroids'`: Array with the resulting centroids.
 *  * `'iterations'`: Number of iterations that took to converge
 */
function kmeans(data, K, options) {
  options = Object.assign({}, defaultOptions, options);

  if (K <= 0 || K > data.length || !Number.isInteger(K)) {
    throw new Error(
      'K should be a positive integer smaller than the number of points'
    );
  }

  var centers;
  if (Array.isArray(options.initialization)) {
    if (options.initialization.length !== K) {
      throw new Error('The initial centers should have the same length as K');
    } else {
      centers = options.initialization;
    }
  } else {
    switch (options.initialization) {
      case 'kmeans++':
        centers = kmeanspp(data, K, options);
        break;
      case 'random':
        centers = random(data, K, options.seed);
        break;
      case 'mostDistant':
        centers = mostDistant(
          data,
          K,
          calculateDistanceMatrix(data, options.distanceFunction),
          options.seed
        );
        break;
      default:
        throw new Error(
          `Unknown initialization method: "${options.initialization}"`
        );
    }
  }

  // infinite loop until convergence
  if (options.maxIterations === 0) {
    options.maxIterations = Number.MAX_VALUE;
  }

  var clusterID = new Array(data.length);
  if (options.withIterations) {
    return kmeansGenerator(centers, data, clusterID, K, options);
  } else {
    var converged = false;
    var stepNumber = 0;
    var stepResult;
    while (!converged && stepNumber < options.maxIterations) {
      stepResult = step(centers, data, clusterID, K, options, ++stepNumber);
      converged = stepResult.converged;
      centers = stepResult.centroids;
    }
    return stepResult.computeInformation(data);
  }
}

module.exports = kmeans;
