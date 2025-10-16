package com.example.batchprocessing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.listener.StepExecutionListenerSupport;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BatchTracingListener extends StepExecutionListenerSupport {

    private static final Logger log = LoggerFactory.getLogger(JobTriggerController.class);

    @Override
    public void beforeStep(StepExecution stepExecution) {
        String traceId = stepExecution.getJobParameters().getString("traceId");
        String parentId = stepExecution.getJobParameters().getString("parentId");

        log.info("Starting job with traceId: {}, parentId: {}", traceId, parentId);

        MDC.put("traceId", traceId);
        MDC.put("parentId", parentId);
    }
}