# Healthchecker

## Quickstart

```sh
git clone git@github.com:keaganluttrell/healthchecker.git

cd healthchecker

npm install

node main.js input.yml
```

### Ad Hoc with any YAML file 
```sh
node main.js path/to/file.yml
```

## Design Choices

1. **Creating a `CONFIG` object**.  It is not used much now, but could be nice to add cli flags in the future to run commands to tweak a default configuration without getting into the code.
2. **Concurrency & Concurrency Limit**.  I am using Async JS, run as many requests in parallel as possible and attempting to resolve them in parrallel.  This is to increase performance of the workload as the YAML list scales.  The concurrency limit is abitrarily 10 to start. This should be tweaked once we know the compute resources we have available for the program.
3. **HTTP Request Timeout**.  I am introducing a timeout to the HTTP requests, such that any the exceed the threshold are aborted. This should mean that HTTP requests will not hand for several seconds, thus making the response window 500ms or whatever the threshold is configured for.  This is a binary test where each Pass or Fail, we are not keeping repsonse time stats. If we were to add this, we could, but at this time its Pass/Fail.
4.  **Graceful Shutdown**.  It is added to let the user know that the program is trying to exit and ultimately will.
5.  **CLI implementation**. The CLI implementation is great for adding arguments directly in the command line to make the program more extensible. This can also be updated to take configuration arguments or files to tweak the configuration.


## Thoughts

1. **Input Files**. Down the road it might be nice to create an interface to handle any configuration file type (YAML, JSON, TOML, etc) and be able to parse the file to run the health checks.
2. **Batching**.  For lists longer that get long we could consider batching. This would take some time to benchmark for the given compute resources to determine the benefit. I personally believe if a list is that long, it may be best to group by endpoint or something that makes sense for the workload to keep list sizes down.  Without any real performance tests, its hard to determine a baseline for max list size.
3. **JS**.  Why not Python or Go?  I chose JS because I know on any given day I can solve almsot any given problem with it.  I also feel its a great protoyping language.  I took this coding challenge at face value, which was we need to implement a program to check the health of HTTP endpoints.  Taking a Minimum Viable Product approach, JS seemed like an easy way to prove the concept and get something working quickly.  I decided to add concurrency, concurrency limits, and the configuration after, so that I could play around and tweak values and increase performance.  at the end of the day, I think this is a good place to start and from here we can fine tune in JS or port to a better suited language without losing more than an afternoon of work.