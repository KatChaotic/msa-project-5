package com.example.batchprocessing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.JobExecution;
import org.springframework.http.ResponseEntity;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Qualifier;

@RestController
@RequestMapping("/api/jobs")
public class JobTriggerController {

    private static final Logger log = LoggerFactory.getLogger(JobTriggerController.class);

    private final JobLauncher jobLauncher;
    private final Job importProductJob;

    public JobTriggerController(
        JobLauncher jobLauncher, @Qualifier("importProductJob") Job importProductJob
    ) {
        this.jobLauncher = jobLauncher;
        this.importProductJob = importProductJob;

        log.info("Controller initialized");
    }

    @GetMapping("/trigger")
    public ResponseEntity<String> trigger() {
        try {
            log.info("Starting Job from API Controller");

            JobParameters jobParameters = new JobParametersBuilder()
                .addLong("startAt", System.currentTimeMillis())
                .addString("traceId", MDC.get("traceId"))
                .addString("parentId", MDC.get("spanId"))
                .toJobParameters();
            
            JobExecution execution = jobLauncher.run(importProductJob, jobParameters);
            
            return ResponseEntity.ok("Job started with ID: " + execution.getId());
        } catch (Exception e) {
            log.error("Failed to start job: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to start job: " + e.getMessage());
        }
    }
}